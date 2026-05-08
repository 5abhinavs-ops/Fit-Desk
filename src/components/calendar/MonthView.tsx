"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { getMonthGrid, getSgtTodayIso, isSameMonthIso } from "@/lib/calendar-grid"
import type { Booking, BookingStatus } from "@/types/database"
import { MonthCell } from "./MonthCell"

export interface MonthViewProps {
  monthAnchor: string
  selectedDate: string
  bookings: readonly Booking[]
  blockedDays: readonly string[]
  isLoading: boolean
  onDayTap: (dateStr: string) => void
}

const SKIP_STATUSES = new Set<BookingStatus>(["cancelled", "no-show", "no_show", "forfeited"])
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

/**
 * Converts a booking's date_time to an SGT YYYY-MM-DD string using Intl.
 * Avoids the naive +8h offset bug present in WeekStrip.toSGT.
 */
function bookingDateInSgt(b: Booking): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(b.date_time))
}

export function MonthView({
  monthAnchor,
  selectedDate,
  bookings,
  blockedDays,
  isLoading,
  onDayTap,
}: MonthViewProps) {
  const grid = getMonthGrid(monthAnchor)
  const todayStr = getSgtTodayIso()
  const blockedSet = new Set(blockedDays)

  // Group bookings by SGT date
  const countMap = new Map<string, { confirmed: number; pending: number }>()
  for (const b of bookings) {
    if (SKIP_STATUSES.has(b.status)) continue
    const key = bookingDateInSgt(b)
    const entry = countMap.get(key) ?? { confirmed: 0, pending: 0 }
    if (b.status === "pending" || b.status === "reschedule_requested") {
      entry.pending++
    } else {
      entry.confirmed++
    }
    countMap.set(key, entry)
  }

  if (isLoading) {
    return (
      <div>
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-0.5 pb-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex justify-center py-1">
              <span className="text-[10px] font-semibold uppercase" style={{ color: "#7A9BB5" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        {/* 42 skeleton cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="flex flex-col items-center py-2" style={{ minHeight: "48px" }}>
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-0.5 pb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="flex justify-center py-1">
            <span className="text-[10px] font-semibold uppercase" style={{ color: "#7A9BB5" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* 6 × 7 grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((dateStr) => {
          const dayNum = parseInt(dateStr.slice(8, 10), 10)
          const counts = countMap.get(dateStr)
          return (
            <MonthCell
              key={dateStr}
              dateStr={dateStr}
              dayNum={dayNum}
              isToday={dateStr === todayStr}
              isSelected={dateStr === selectedDate}
              isOutsideMonth={!isSameMonthIso(dateStr, monthAnchor)}
              isBlocked={blockedSet.has(dateStr)}
              confirmedCount={counts?.confirmed ?? 0}
              pendingCount={counts?.pending ?? 0}
              onTap={onDayTap}
            />
          )
        })}
      </div>
    </div>
  )
}
