/**
 * calendar-url.ts
 * Pure URL state parse/serialize for the calendar feature.
 * Never throws — all invalid input returns a safe default.
 */

import { z } from "zod"
import { getSgtTodayIso, parseIsoDateStrict } from "@/lib/calendar-grid"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarView = "month" | "week" | "day"

export interface CalendarUrlState {
  view: CalendarView
  date: string // always a valid YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Internal Zod schema
// ---------------------------------------------------------------------------

const calendarViewSchema = z.enum(["month", "week", "day"])

const calendarUrlSchema = z.object({
  view: calendarViewSchema,
  date: z.string().refine((d) => parseIsoDateStrict(d) !== null, {
    message: "Invalid ISO date",
  }),
})

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type RawParams = URLSearchParams | { view?: string | null; date?: string | null }

function extractRaw(params: RawParams): { view: string | null; date: string | null } {
  if (params instanceof URLSearchParams) {
    return { view: params.get("view"), date: params.get("date") }
  }
  return {
    view: params.view ?? null,
    date: params.date ?? null,
  }
}

/**
 * Parses search params into CalendarUrlState.
 * Falls back to { view:"month", date: getSgtTodayIso(now) } on any invalid input.
 */
export function parseCalendarUrlState(
  searchParams: RawParams,
  now?: Date,
): CalendarUrlState {
  const fallback: CalendarUrlState = {
    view: "month",
    date: getSgtTodayIso(now),
  }

  const raw = extractRaw(searchParams)
  const result = calendarUrlSchema.safeParse({ view: raw.view, date: raw.date })

  if (!result.success) return fallback
  return { view: result.data.view, date: result.data.date }
}

/**
 * Serializes CalendarUrlState to a query string (no leading ?).
 * Both keys are always emitted.
 */
export function serializeCalendarUrlState(state: CalendarUrlState): string {
  const params = new URLSearchParams()
  params.set("view", state.view)
  params.set("date", state.date)
  return params.toString()
}
