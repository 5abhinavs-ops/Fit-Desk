"use client"

import { useMemo } from "react"
import { parseISO, addDays, format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { X } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import type { Booking, BookingStatus } from "@/types/database"

interface WeekStripProps {
  weekStart: string
  bookings: Booking[]
  blockedDays: string[]
  selectedDate: string
  onDayTap: (date: string) => void
  isLoading: boolean
}

const SKIP_STATUSES = new Set<BookingStatus>(["cancelled", "no-show", "no_show", "forfeited"])

function toSGT(isoString: string): Date {
  const d = new Date(isoString)
  return new Date(d.getTime() + 8 * 60 * 60 * 1000)
}

function sgtToday(): string {
  const now = new Date()
  const sgt = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000)
  return format(sgt, "yyyy-MM-dd")
}

export function WeekStrip({
  weekStart,
  bookings,
  blockedDays,
  selectedDate,
  onDayTap,
  isLoading,
}: WeekStripProps) {
  const todayStr = sgtToday()
  const blockedSet = useMemo(() => new Set(blockedDays), [blockedDays])

  const columns = useMemo(() => {
    const monday = parseISO(weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i)
      return {
        dateStr: format(d, "yyyy-MM-dd"),
        dayName: format(d, "EEE").toUpperCase(),
        dayNum: format(d, "d"),
      }
    })
  }, [weekStart])

  const grouped = useMemo(() => {
    const map = new Map<string, { confirmed: number; pending: number }>()
    for (const b of bookings) {
      if (SKIP_STATUSES.has(b.status)) continue
      const sgt = toSGT(b.date_time)
      const key = format(sgt, "yyyy-MM-dd")
      const entry = map.get(key) ?? { confirmed: 0, pending: 0 }
      if (b.status === "pending" || b.status === "reschedule_requested") {
        entry.pending++
      } else {
        entry.confirmed++
      }
      map.set(key, entry)
    }
    return map
  }, [bookings])

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <Skeleton className="h-2.5 w-6" />
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3 w-4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-0.5">
      {columns.map((col) => {
        const isToday = col.dateStr === todayStr
        const isSelected = col.dateStr === selectedDate
        const isDayBlocked = blockedSet.has(col.dateStr)
        const counts = grouped.get(col.dateStr)

        return (
          <button
            key={col.dateStr}
            type="button"
            onClick={() => onDayTap(col.dateStr)}
            className="relative flex flex-col items-center rounded-lg py-2 transition-colors"
            style={{
              background: isDayBlocked ? "rgba(225,29,72,0.08)" : "transparent",
            }}
            aria-label={`${col.dayName}, ${col.dayNum}${isDayBlocked ? ", blocked" : counts ? `, ${counts.confirmed + counts.pending} sessions` : ""}`}
          >
            {/* Day name — micro scale, semibold, muted, pairs with date below */}
            <span
              className="text-micro font-semibold uppercase"
              style={{ color: "#7A9BB5" }}
            >
              {col.dayName}
            </span>

            {/* Day number — display-sm scale, semibold, tight to the label above */}
            {isToday ? (
              <span
                className="mt-0.5 flex items-center justify-center rounded-full text-display-sm font-semibold"
                style={{
                  width: "28px",
                  height: "28px",
                  background: "#00C6D4",
                  color: "#0D1B2A",
                }}
              >
                {col.dayNum}
              </span>
            ) : (
              <span
                className="mt-0.5 flex items-center justify-center text-display-sm font-semibold"
                style={{
                  width: "28px",
                  height: "28px",
                  color: isDayBlocked ? "#e11d48" : "white",
                }}
              >
                {col.dayNum}
              </span>
            )}

            {/* Status row */}
            <div className="mt-0.5 flex items-center justify-center" style={{ height: "12px" }}>
              {isDayBlocked ? (
                // 10px status dot in compact week strip
                <Icon name={X} size="sm" className="size-2.5 text-rose-500" />
              ) : counts ? (
                <div className="flex items-center gap-0.5">
                  <span
                    className="rounded-full"
                    style={{
                      width: "6px",
                      height: "6px",
                      background: counts.confirmed > 0 ? "#00C6D4" : "#FFB347",
                    }}
                  />
                  <span className="text-micro" style={{ color: counts.confirmed > 0 ? "#00C6D4" : "#FFB347" }}>
                    {counts.confirmed + counts.pending}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Selected underline */}
            {isSelected && (
              <div
                className="absolute bottom-0 left-1/4 right-1/4"
                style={{ height: "2px", background: "#00C6D4", borderRadius: "1px" }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
