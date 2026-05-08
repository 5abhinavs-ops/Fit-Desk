"use client"

import { parseISO, format, addDays } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import type { CalendarView } from "@/lib/calendar-url"
import { getWeekStartFromDate } from "@/lib/calendar-grid"

export interface CalendarNavProps {
  view: CalendarView
  date: string
  isOnTodayUnit: boolean
  onViewChange: (next: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonthYear(date: string): string {
  return format(parseISO(date), "MMMM yyyy")
}

function formatWeekRange(date: string): string {
  const weekStart = getWeekStartFromDate(date)
  const start = parseISO(weekStart)
  const end = addDays(start, 6)
  // e.g. "5 May – 11 May" or "28 Apr – 4 May"
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "d")} ${format(start, "MMM")} – ${format(end, "d MMM")}`
  }
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`
}

function formatDayLabel(date: string): string {
  return format(parseISO(date), "EEE, d MMM")
}

function unitLabel(view: CalendarView): string {
  return view === "month" ? "month" : view === "week" ? "week" : "day"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CalendarNav
 * Header above the calendar: breadcrumb + prev/next/today controls.
 */
export function CalendarNav({
  view,
  date,
  isOnTodayUnit,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarNavProps) {
  const unit = unitLabel(view)

  // Prev / Next / Today controls — shared across all views
  const controls = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Previous ${unit}`}
        onClick={onPrev}
        className="flex items-center justify-center rounded-lg p-1 hover:bg-white/10"
        style={{ minHeight: "36px", minWidth: "36px" }}
      >
        <Icon name={ChevronLeft} size="sm" />
      </button>

      <span className="min-w-[100px] text-center text-sm font-semibold text-white">
        {view === "month" && formatMonthYear(date)}
        {view === "week" && formatWeekRange(date)}
        {view === "day" && formatDayLabel(date)}
      </span>

      <button
        type="button"
        aria-label={`Next ${unit}`}
        onClick={onNext}
        className="flex items-center justify-center rounded-lg p-1 hover:bg-white/10"
        style={{ minHeight: "36px", minWidth: "36px" }}
      >
        <Icon name={ChevronRight} size="sm" />
      </button>

      {!isOnTodayUnit && (
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
      )}
    </div>
  )

  // ---------------------------------------------------------------------------
  // Breadcrumb segments
  // ---------------------------------------------------------------------------

  if (view === "month") {
    // Single row: chevrons on edges, label centered, Today pill after.
    return (
      <div className="flex items-center px-1 py-2 gap-1">
        <button
          type="button"
          aria-label={`Previous ${unit}`}
          onClick={onPrev}
          className="flex items-center justify-center rounded-lg p-1 hover:bg-white/10"
          style={{ minHeight: "36px", minWidth: "36px" }}
        >
          <Icon name={ChevronLeft} size="sm" />
        </button>

        <span className="flex-1 text-center text-sm font-semibold text-white">
          {formatMonthYear(date)}
        </span>

        <button
          type="button"
          aria-label={`Next ${unit}`}
          onClick={onNext}
          className="flex items-center justify-center rounded-lg p-1 hover:bg-white/10"
          style={{ minHeight: "36px", minWidth: "36px" }}
        >
          <Icon name={ChevronRight} size="sm" />
        </button>

        {!isOnTodayUnit && (
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
        )}
      </div>
    )
  }

  if (view === "week") {
    // Two rows: [Month button › Week plain] then controls
    return (
      <div className="flex flex-col gap-1 px-1 py-2">
        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => onViewChange("month")}
            className="font-semibold text-white hover:underline"
          >
            {format(parseISO(date), "MMMM")}
          </button>
          <span style={{ color: "#7A9BB5" }}>›</span>
          <span className="text-white/70">{formatWeekRange(date)}</span>
        </div>
        {controls}
      </div>
    )
  }

  // view === "day"
  // Three rows: [Month button › Week button › Day plain] then controls
  return (
    <div className="flex flex-col gap-1 px-1 py-2">
      <div className="flex items-center gap-1 text-sm">
        <button
          type="button"
          onClick={() => onViewChange("month")}
          className="font-semibold text-white hover:underline"
        >
          {format(parseISO(date), "MMMM")}
        </button>
        <span style={{ color: "#7A9BB5" }}>›</span>
        <button
          type="button"
          onClick={() => onViewChange("week")}
          className="text-white/70 hover:underline"
        >
          {formatWeekRange(date)}
        </button>
        <span style={{ color: "#7A9BB5" }}>›</span>
        <span className="text-white/70">{formatDayLabel(date)}</span>
      </div>
      {controls}
    </div>
  )
}
