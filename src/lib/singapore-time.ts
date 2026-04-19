/** Singapore (SGT) helpers — use Intl for DST-safe wall-clock fields. */

import { differenceInCalendarDays } from "date-fns"

const SG = "Asia/Singapore"

function singaporeCalendarParts(d: Date): { y: number; m: number; day: number } {
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

function utcCalendarDate(parts: { y: number; m: number; day: number }): Date {
  return new Date(Date.UTC(parts.y, parts.m - 1, parts.day))
}

/** Calendar day difference in Singapore (toInstant's day − fromInstant's day). */
export function differenceInCalendarDaysSingapore(
  fromInstant: Date,
  toInstant: Date,
): number {
  const a = singaporeCalendarParts(fromInstant)
  const b = singaporeCalendarParts(toInstant)
  return differenceInCalendarDays(utcCalendarDate(b), utcCalendarDate(a))
}

export function getGreetingPeriodSingapore(now: Date): "morning" | "afternoon" | "evening" {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SG,
      hour: "numeric",
      hour12: false,
    }).format(now),
    10,
  )
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}

export function formatGreetingLabelSingapore(now: Date): string {
  const p = getGreetingPeriodSingapore(now)
  if (p === "morning") return "Good morning"
  if (p === "afternoon") return "Good afternoon"
  return "Good evening"
}

/** e.g. "9:30 am" in Singapore for an ISO timestamp */
export function formatTimeSingapore(isoDateTime: string): string {
  const d = new Date(isoDateTime)
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SG,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d)
}

/** Weekday name in Singapore for an ISO timestamp */
export function formatWeekdayLongSingapore(isoDateTime: string): string {
  const d = new Date(isoDateTime)
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: SG,
    weekday: "long",
  }).format(d)
}
