"use client"

import { useMemo } from "react"
import { parseISO, addDays, format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import type { Booking, BookingStatus } from "@/types/database"

interface WeekHeatmapProps {
  weekStart: string
  bookings: Booking[]
  isLoading: boolean
  selectedDate: string
  onDayTap: (date: string) => void
}

const BAND_HEIGHT = 120
const HOUR_START = 6
const HOUR_END = 21
const PX_PER_HOUR = BAND_HEIGHT / (HOUR_END - HOUR_START) // 8

const SKIP_STATUSES = new Set<BookingStatus>(["cancelled", "no-show", "no_show", "forfeited"])

/** Convert an ISO date-time string to a Date shifted to SGT (UTC+8). */
function toSGT(isoString: string): Date {
  const d = new Date(isoString)
  return new Date(d.getTime() + 8 * 60 * 60 * 1000)
}

/** Get SGT "today" as yyyy-MM-dd. */
function sgtToday(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000)
  return format(sgt, "yyyy-MM-dd")
}

function getBlockColor(status: BookingStatus): string {
  if (status === "completed") return "bg-primary"
  if (status === "confirmed" || status === "upcoming" || status === "pending_approval")
    return "bg-primary/70"
  if (status === "pending" || status === "reschedule_requested")
    return "bg-amber-500/80"
  return "bg-primary/70"
}

export function WeekHeatmap({
  weekStart,
  bookings,
  isLoading,
  selectedDate,
  onDayTap,
}: WeekHeatmapProps) {
  const todayStr = sgtToday()

  const columns = useMemo(() => {
    const monday = parseISO(weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i)
      return {
        dateStr: format(d, "yyyy-MM-dd"),
        dayName: format(d, "EEE"),
        dayNum: format(d, "d"),
      }
    })
  }, [weekStart])

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of bookings) {
      if (SKIP_STATUSES.has(b.status)) continue
      const sgt = toSGT(b.date_time)
      const key = format(sgt, "yyyy-MM-dd")
      const arr = map.get(key)
      if (arr) {
        arr.push(b)
      } else {
        map.set(key, [b])
      }
    }
    return map
  }, [bookings])

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-5 w-5 rounded-full" />
            <div className="relative h-[120px] w-full space-y-1 pt-1">
              <Skeleton className="h-6 w-full rounded-sm" />
              <Skeleton className="h-10 w-full rounded-sm" />
              <Skeleton className="h-4 w-full rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {columns.map((col) => {
        const dayBookings = grouped.get(col.dateStr) ?? []
        const isToday = col.dateStr === todayStr
        const isSelected = col.dateStr === selectedDate
        const hasPending = dayBookings.some(
          (b) => b.status === "pending" || b.status === "reschedule_requested",
        )
        const hasNonPending = dayBookings.some(
          (b) => b.status !== "pending" && b.status !== "reschedule_requested",
        )

        return (
          <button
            key={col.dateStr}
            type="button"
            onClick={() => onDayTap(col.dateStr)}
            className={`flex flex-col items-center rounded-lg transition-colors ${
              isSelected ? "bg-accent/50" : "hover:bg-accent/30"
            }`}
            aria-label={`${col.dayName}, ${col.dayNum}, ${dayBookings.length} session${dayBookings.length !== 1 ? "s" : ""}`}
          >
            {/* Day header */}
            <span className="text-muted-foreground mt-1 text-[9px] font-medium uppercase">
              {col.dayName}
            </span>

            {isToday ? (
              <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[15px] font-bold leading-none">
                {col.dayNum}
              </span>
            ) : (
              <span className="text-[15px] font-bold leading-none">{col.dayNum}</span>
            )}

            {/* Session dot */}
            <div className="flex h-2 items-center justify-center gap-0.5">
              {hasNonPending && <span className="bg-primary h-1 w-1 rounded-full" />}
              {hasPending && <span className="h-1 w-1 rounded-full bg-amber-500" />}
            </div>

            {/* Time band area */}
            <div className="bg-muted/30 relative h-[120px] w-full rounded-sm">
              {dayBookings.map((b) => {
                const sgt = toSGT(b.date_time)
                const hour = sgt.getUTCHours()
                const mins = sgt.getUTCMinutes()
                const rawTop = (hour - HOUR_START) * PX_PER_HOUR + (mins / 60) * PX_PER_HOUR
                const rawHeight = Math.max((b.duration_mins / 60) * PX_PER_HOUR, 4)
                const top = Math.max(0, rawTop)
                const height = Math.min(rawHeight, BAND_HEIGHT - top)
                if (height <= 0) return null

                return (
                  <div
                    key={b.id}
                    className={`absolute left-1 right-1 rounded-sm ${getBlockColor(b.status)}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  />
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}
