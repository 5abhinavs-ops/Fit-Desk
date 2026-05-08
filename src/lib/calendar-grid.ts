/**
 * calendar-grid.ts
 * Pure SGT-aware calendar math. No I/O, no React.
 * All wall-clock fields derived via Intl.DateTimeFormat to avoid naive offset bugs.
 */

import { addDays, addWeeks } from "date-fns"

const SG = "Asia/Singapore"

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function sgtParts(d: Date): { y: number; m: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SG,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const y = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10)
  const m = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10)
  const day = parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10)
  return { y, m, day }
}

function padTwo(n: number): string {
  return String(n).padStart(2, "0")
}

function partsToIso(y: number, m: number, d: number): string {
  return `${y}-${padTwo(m)}-${padTwo(d)}`
}

/**
 * Parse an ISO date string to its numeric parts without trusting Date constructor coercion.
 * Returns null if the string does not match YYYY-MM-DD format.
 */
function parseIsoParts(
  isoDate: string,
): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  const y = parseInt(isoDate.slice(0, 4), 10)
  const m = parseInt(isoDate.slice(5, 7), 10)
  const d = parseInt(isoDate.slice(8, 10), 10)
  return { y, m, d }
}

/** Number of days in a given month (1-indexed). */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * Convert an ISO date string (already validated) to a UTC-noon Date so that
 * date-fns arithmetic works without local-TZ crossing issues.
 */
function isoToUtcNoon(isoDate: string): Date {
  const p = parseIsoParts(isoDate)
  if (p === null) throw new Error(`Invalid ISO date: ${isoDate}`)
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0))
}

function utcNoonToIso(d: Date): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  return partsToIso(y, m, day)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the SGT calendar date as "YYYY-MM-DD" for the given instant (defaults to now). */
export function getSgtTodayIso(now: Date = new Date()): string {
  const { y, m, day } = sgtParts(now)
  return partsToIso(y, m, day)
}

/**
 * Strictly parses "YYYY-MM-DD".
 * Returns null for any invalid calendar date (e.g. "2025-02-30", "abc").
 */
export function parseIsoDateStrict(isoDate: string): Date | null {
  const p = parseIsoParts(isoDate)
  if (p === null) return null
  const { y, m, d } = p
  // Validate ranges
  if (m < 1 || m > 12) return null
  const max = daysInMonth(y, m)
  if (d < 1 || d > max) return null
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * Returns the ISO date of the Monday of the week containing the 1st of the
 * month defined by anchorIso. Throws on invalid input.
 */
export function getMonthGridStart(anchorIso: string): string {
  const p = parseIsoParts(anchorIso)
  if (p === null) throw new Error(`Invalid anchor ISO date: ${anchorIso}`)
  const { y, m } = p
  // First day of the month
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0))
  return getWeekStartFromDate(utcNoonToIso(firstOfMonth))
}

/**
 * Returns an array of 42 ISO date strings for a 6-row × 7-col Mon-anchored grid
 * whose anchor month is determined by anchorIso.
 */
export function getMonthGrid(anchorIso: string): string[] {
  const start = getMonthGridStart(anchorIso)
  const startDate = isoToUtcNoon(start)
  const grid: string[] = []
  for (let i = 0; i < 42; i++) {
    const d = addDays(startDate, i)
    grid.push(utcNoonToIso(d))
  }
  return grid
}

/**
 * Returns the ISO date of the Monday of the week containing dateIso.
 * ISO week: Mon=1 … Sun=7. Sunday needs special handling (JS: Sun=0).
 */
export function getWeekStartFromDate(dateIso: string): string {
  const d = isoToUtcNoon(dateIso)
  // getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const dow = d.getUTCDay()
  // Convert to ISO weekday: Mon=0, ..., Sun=6
  const isoOffset = dow === 0 ? 6 : dow - 1
  const monday = addDays(d, -isoOffset)
  return utcNoonToIso(monday)
}

/**
 * Adds delta months to anchorIso, clamping to the last day of the result month
 * if the anchor day exceeds it (e.g. Jan 31 + 1 → Feb 28/29).
 */
export function addMonthsSgt(anchorIso: string, delta: number): string {
  const p = parseIsoParts(anchorIso)
  if (p === null) throw new Error(`Invalid ISO date: ${anchorIso}`)
  const { y, m, d } = p

  const totalMonths = y * 12 + (m - 1) + delta
  const newYear = Math.floor(totalMonths / 12)
  const newMonth = (totalMonths % 12) + 1
  const maxDay = daysInMonth(newYear, newMonth)
  const clampedDay = Math.min(d, maxDay)

  return partsToIso(newYear, newMonth, clampedDay)
}

/** Adds delta days to dateIso. */
export function addDaysIso(dateIso: string, delta: number): string {
  const d = isoToUtcNoon(dateIso)
  return utcNoonToIso(addDays(d, delta))
}

/** Adds delta weeks to dateIso. */
export function addWeeksIso(dateIso: string, delta: number): string {
  const d = isoToUtcNoon(dateIso)
  return utcNoonToIso(addWeeks(d, delta))
}

/** Returns true if aIso and bIso share the same YYYY-MM. */
export function isSameMonthIso(aIso: string, bIso: string): boolean {
  return aIso.slice(0, 7) === bIso.slice(0, 7)
}
