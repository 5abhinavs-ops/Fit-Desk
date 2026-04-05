"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Ban, Plus } from "lucide-react"
import type { Booking, Client } from "@/types/database"

interface DayTimelineProps {
  date: string
  bookings: Booking[]
  clients: Client[]
  blockedDays: string[]
  onBookingTap: (booking: Booking) => void
  onEmptySlotTap: (startTime: string) => void
  isLoading: boolean
}

const HOUR_START = 6
const HOUR_END = 22
const HOUR_HEIGHT = 64
const HALF_HOUR = HOUR_HEIGHT / 2
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT
const TIME_COL_WIDTH = 44

const SKIP_STATUSES = new Set(["cancelled", "no-show", "no_show", "forfeited"])

function sgtToday(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000)
  return format(sgt, "yyyy-MM-dd")
}

function sgtNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000)
}

function toSGT(isoString: string): Date {
  const d = new Date(isoString)
  return new Date(d.getTime() + 8 * 60 * 60 * 1000)
}

function getLeftBorderColor(status: string): string {
  if (status === "confirmed" || status === "upcoming") return "#00C6D4"
  if (status === "pending" || status === "pending_approval" || status === "reschedule_requested") return "#FFB347"
  if (status === "completed") return "#00E096"
  return "#64748B"
}

function getStatusLabel(status: string): string {
  if (status === "confirmed" || status === "upcoming") return "Confirmed"
  if (status === "pending" || status === "pending_approval") return "Pending"
  if (status === "reschedule_requested") return "Reschedule"
  if (status === "completed") return "Done"
  if (status === "cancelled" || status === "forfeited") return "Cancelled"
  return status
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

export function DayTimeline({
  date,
  bookings,
  clients,
  blockedDays,
  onBookingTap,
  onEmptySlotTap,
  isLoading,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const sgt = sgtNow()
    return sgt.getUTCHours() * 60 + sgt.getUTCMinutes()
  })

  const todayStr = sgtToday()
  const isToday = date === todayStr
  const isDayBlocked = blockedDays.includes(date)

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>()
    for (const c of clients) map.set(c.id, c)
    return map
  }, [clients])

  // Filter to visible bookings (not cancelled)
  const visibleBookings = useMemo(
    () => bookings.filter((b) => !SKIP_STATUSES.has(b.status)),
    [bookings],
  )

  // Compute occupied 30-min slot set for empty slot rendering
  const occupiedSlots = useMemo(() => {
    const set = new Set<number>()
    for (const b of visibleBookings) {
      const sgt = toSGT(b.date_time)
      const startMins = sgt.getUTCHours() * 60 + sgt.getUTCMinutes()
      const slots = Math.ceil(b.duration_mins / 30)
      for (let i = 0; i < slots; i++) {
        set.add(startMins + i * 30)
      }
    }
    return set
  }, [visibleBookings])

  // Current time line update
  useEffect(() => {
    if (!isToday) return
    const interval = setInterval(() => {
      const sgt = sgtNow()
      setNowMinutes(sgt.getUTCHours() * 60 + sgt.getUTCMinutes())
    }, 60000)
    return () => clearInterval(interval)
  }, [isToday])

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current || !date) return
    const targetMinutes = isToday ? nowMinutes - 30 : 7 * 60
    const top = Math.max(0, ((targetMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT)
    scrollRef.current.scrollTop = top
  }, [date, isToday, nowMinutes])

  // Loading state
  if (isLoading || !date) {
    return (
      <div className="flex-1 overflow-hidden rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 rounded-lg" style={{ marginTop: "60px" }} />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" style={{ marginTop: "40px" }} />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    )
  }

  const nowTop = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_HEIGHT

  // Generate 30-min empty slots
  const emptySlots: number[] = []
  for (let mins = HOUR_START * 60; mins < HOUR_END * 60; mins += 30) {
    if (!occupiedSlots.has(mins)) {
      emptySlots.push(mins)
    }
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto rounded-lg"
      style={{
        maxHeight: "calc(100vh - 280px)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Blocked day banner */}
      {isDayBlocked && (
        <div
          className="sticky top-0 z-10 flex items-center justify-center gap-2"
          style={{
            height: "48px",
            background: "rgba(225,29,72,0.12)",
            border: "1px solid rgba(225,29,72,0.3)",
            color: "#e11d48",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <Ban style={{ width: "14px", height: "14px" }} />
          Day blocked — no new bookings available
        </div>
      )}

      {/* Timeline grid */}
      <div className="relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
        {/* Hour rows + labels */}
        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => {
          const hour = HOUR_START + i
          const top = i * HOUR_HEIGHT
          return (
            <div key={hour} className="absolute left-0 right-0" style={{ top: `${top}px` }}>
              {/* Hour border */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: 0,
                  height: "1px",
                  background: "rgba(255,255,255,0.06)",
                }}
              />
              {/* Half-hour mark */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: `${HALF_HOUR}px`,
                  height: "1px",
                  background: "rgba(255,255,255,0.03)",
                  borderTop: "1px dashed rgba(255,255,255,0.03)",
                }}
              />
              {/* Time label */}
              <span
                className="absolute text-right"
                style={{
                  top: "-6px",
                  left: 0,
                  width: `${TIME_COL_WIDTH - 8}px`,
                  fontSize: "11px",
                  color: "#7A9BB5",
                  paddingRight: "8px",
                }}
              >
                {formatHourLabel(hour)}
              </span>
            </div>
          )
        })}

        {/* Empty slot tap areas */}
        {!isDayBlocked && emptySlots.map((mins) => {
          const top = ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT
          const hh = Math.floor(mins / 60).toString().padStart(2, "0")
          const mm = (mins % 60).toString().padStart(2, "0")
          return (
            <button
              key={`empty-${mins}`}
              type="button"
              className="group absolute flex items-center justify-center transition-colors"
              style={{
                top: `${top}px`,
                left: `${TIME_COL_WIDTH}px`,
                right: "0",
                height: `${HALF_HOUR}px`,
              }}
              onClick={() => onEmptySlotTap(`${hh}:${mm}`)}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: "rgba(0,198,212,0.05)" }}
              >
                <Plus style={{ width: "14px", height: "14px", color: "rgba(0,198,212,0.4)" }} />
              </div>
            </button>
          )
        })}

        {/* Booking cards */}
        {visibleBookings.map((b) => {
          const sgt = toSGT(b.date_time)
          const hour = sgt.getUTCHours()
          const mins = sgt.getUTCMinutes()
          const top = ((hour - HOUR_START) * 60 + mins) / 60 * HOUR_HEIGHT
          const height = Math.max((b.duration_mins / 60) * HOUR_HEIGHT, HALF_HOUR)
          const borderColor = getLeftBorderColor(b.status)
          const client = clientMap.get(b.client_id)
          const clientName = client ? `${client.first_name} ${client.last_name}` : "Unknown"
          const isCompact = b.duration_mins < 45

          const endMins = (hour * 60 + mins + b.duration_mins)
          const endH = Math.floor(endMins / 60)
          const endM = endMins % 60
          const endDate = new Date(2000, 0, 1, endH, endM)
          const startDate = new Date(2000, 0, 1, hour, mins)
          const timeRange = `${format(startDate, "h:mm")} – ${format(endDate, "h:mm a")}`

          return (
            <button
              key={b.id}
              type="button"
              className="absolute cursor-pointer transition-opacity hover:opacity-90"
              style={{
                top: `${top}px`,
                height: `${height}px`,
                left: `${TIME_COL_WIDTH + 4}px`,
                right: "4px",
                background: "#12263A",
                borderRadius: "10px",
                borderLeft: `3px solid ${borderColor}`,
                padding: "6px 8px",
                zIndex: 5,
              }}
              onClick={() => onBookingTap(b)}
            >
              <div className="flex h-full flex-col justify-center text-left">
                <p
                  className="truncate font-bold"
                  style={{ fontSize: "13px", color: "white", lineHeight: "1.2" }}
                >
                  {clientName}
                  {b.booking_source === "recurring" && (
                    <span style={{ color: "#00C6D4", marginLeft: "4px", fontWeight: 400 }}>↻</span>
                  )}
                </p>
                {!isCompact && (
                  <p
                    className="truncate"
                    style={{ fontSize: "11px", color: "#7A9BB5", marginTop: "2px" }}
                  >
                    {timeRange}
                  </p>
                )}
                {!isCompact && (
                  <span
                    className="mt-1 inline-block self-start rounded-full px-1.5 py-0.5"
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      color: borderColor,
                      background: `${borderColor}1A`,
                    }}
                  >
                    {getStatusLabel(b.status)}
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {/* Current time line */}
        {isToday && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
          <div
            className="pointer-events-none absolute left-0 right-0"
            style={{ top: `${nowTop}px`, zIndex: 10 }}
          >
            <div className="relative flex items-center">
              <span
                className="absolute rounded-full"
                style={{
                  width: "6px",
                  height: "6px",
                  background: "#00C6D4",
                  left: `${TIME_COL_WIDTH - 3}px`,
                  top: "-2.5px",
                }}
              />
              <div
                className="absolute right-0"
                style={{
                  left: `${TIME_COL_WIDTH}px`,
                  height: "1px",
                  background: "rgba(0,198,212,0.8)",
                }}
              />
            </div>
          </div>
        )}

        {/* Empty day message */}
        {visibleBookings.length === 0 && !isDayBlocked && (
          <div
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{
              top: `${3 * HOUR_HEIGHT}px`,
              color: "#7A9BB5",
              fontSize: "13px",
            }}
          >
            No sessions — tap any slot to add one
          </div>
        )}
      </div>
    </div>
  )
}
