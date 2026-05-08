/**
 * calendar-transitions.ts
 * Pure view-transition logic for the calendar feature.
 */

import {
  getSgtTodayIso,
  addMonthsSgt,
  addWeeksIso,
  addDaysIso,
  getWeekStartFromDate,
  isSameMonthIso,
} from "@/lib/calendar-grid"
import type { CalendarUrlState, CalendarView } from "@/lib/calendar-url"

// Re-export the type so consumers can import from here if desired
export type { CalendarUrlState, CalendarView }

// ---------------------------------------------------------------------------
// Transition constructors
// ---------------------------------------------------------------------------

export function transitionToWeek(date: string): CalendarUrlState {
  return { view: "week", date }
}

export function transitionToDay(date: string): CalendarUrlState {
  return { view: "day", date }
}

export function transitionToMonth(date: string): CalendarUrlState {
  return { view: "month", date }
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Move up one view level: day → week, week → month, month → month (no-op).
 * Date is preserved unchanged.
 */
export function transitionUp(state: CalendarUrlState): CalendarUrlState {
  const up: Record<CalendarView, CalendarView> = {
    day: "week",
    week: "month",
    month: "month",
  }
  return { view: up[state.view], date: state.date }
}

/**
 * Step forward (+1) or backward (-1) by the natural unit of the current view.
 * Month: addMonthsSgt (with end-of-month clamping).
 * Week: addWeeksIso.
 * Day: addDaysIso.
 */
export function stepUnit(
  state: CalendarUrlState,
  delta: -1 | 1,
): CalendarUrlState {
  switch (state.view) {
    case "month":
      return { view: "month", date: addMonthsSgt(state.date, delta) }
    case "week":
      return { view: "week", date: addWeeksIso(state.date, delta) }
    case "day":
      return { view: "day", date: addDaysIso(state.date, delta) }
  }
}

/**
 * Returns a new state with the same view but date set to SGT today.
 */
export function goToToday(
  state: CalendarUrlState,
  now?: Date,
): CalendarUrlState {
  return { view: state.view, date: getSgtTodayIso(now) }
}

/**
 * Returns true when the state's date falls on/within the current SGT "today" unit.
 *
 * Month: state's date shares YYYY-MM with SGT today.
 * Week: state's date shares the same Mon-anchored week as SGT today.
 * Day: state's date equals SGT today.
 */
export function isOnToday(
  state: CalendarUrlState,
  now?: Date,
): boolean {
  const today = getSgtTodayIso(now)

  switch (state.view) {
    case "month":
      return isSameMonthIso(state.date, today)
    case "week":
      return getWeekStartFromDate(state.date) === getWeekStartFromDate(today)
    case "day":
      return state.date === today
  }
}
