"use client"

import { parseISO, format } from "date-fns"
import { Ban } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { SessionIndicator } from "./SessionIndicator"

export interface MonthCellProps {
  dateStr: string
  dayNum: number
  isToday: boolean
  isSelected: boolean
  isOutsideMonth: boolean
  isBlocked: boolean
  confirmedCount: number
  pendingCount: number
  onTap: (dateStr: string) => void
}

/**
 * MonthCell
 * Single day cell rendered inside the month grid.
 * Mobile-first: min-height 48px, full-width, 44px+ tap target.
 */
export function MonthCell({
  dateStr,
  dayNum,
  isToday,
  isSelected,
  isOutsideMonth,
  isBlocked,
  confirmedCount,
  pendingCount,
  onTap,
}: MonthCellProps) {
  const parsed = parseISO(dateStr)
  const dayName = format(parsed, "EEEE")
  const monthName = format(parsed, "MMMM")
  const total = confirmedCount + pendingCount

  const ariaLabel = [
    `${dayName}, ${dayNum} ${monthName}`,
    isBlocked ? "blocked" : null,
    total > 0 ? `${total} sessions` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <button
      type="button"
      onClick={() => onTap(dateStr)}
      aria-label={ariaLabel}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      className="relative flex w-full flex-col items-center py-2"
      style={{
        minHeight: "48px",
        background: isBlocked ? "rgba(225, 29, 72, 0.08)" : "transparent",
      }}
    >
      {/* Day number */}
      {isToday ? (
        <span
          className="flex items-center justify-center rounded-full text-sm font-semibold"
          style={{
            width: "28px",
            height: "28px",
            background: "#00C6D4",
            color: "#0D1B2A",
          }}
        >
          {dayNum}
        </span>
      ) : (
        <span
          className="flex items-center justify-center text-sm font-semibold"
          style={{
            width: "28px",
            height: "28px",
            color: isBlocked ? "#e11d48" : "white",
            opacity: isOutsideMonth ? 0.4 : 1,
          }}
        >
          {dayNum}
        </span>
      )}

      {/* Blocked icon */}
      {isBlocked && (
        <span className="absolute right-1 top-1">
          <Icon name={Ban} size="sm" className="text-rose-500" />
        </span>
      )}

      {/* Session indicator */}
      <div className="mt-0.5">
        <SessionIndicator
          variant="month"
          confirmed={confirmedCount}
          pending={pendingCount}
        />
      </div>

      {/* Selected underline (only when not today) */}
      {isSelected && !isToday && (
        <div
          className="absolute bottom-0 left-1/4 right-1/4"
          style={{ height: "2px", background: "#00C6D4", borderRadius: "1px" }}
        />
      )}
    </button>
  )
}
