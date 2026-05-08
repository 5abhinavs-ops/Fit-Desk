import { describe, it, expect } from "vitest"
import {
  parseCalendarUrlState,
  serializeCalendarUrlState,
} from "../calendar-url"
import type { CalendarUrlState } from "../calendar-url"

// Injected "now" for deterministic SGT-today fallback: UTC 15:30 = SGT 23:30 (May 2)
const FIXED_NOW = new Date("2025-05-02T15:30:00Z")
const SGT_TODAY = "2025-05-02"

describe("parseCalendarUrlState — URLSearchParams input", () => {
  it("parses month view with valid date", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=month&date=2025-05-07"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "month", date: "2025-05-07" })
  })

  it("parses week view with valid date", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=week&date=2025-05-07"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "week", date: "2025-05-07" })
  })

  it("parses day view with valid date", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=day&date=2025-05-07"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "day", date: "2025-05-07" })
  })

  it("falls back fully when view is invalid", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=invalid"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })

  it("falls back fully when date is invalid (month 13)", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=week&date=2025-13-40"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })

  it("falls back fully when date is Feb 30", () => {
    const result = parseCalendarUrlState(
      new URLSearchParams("view=day&date=2025-02-30"),
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })

  it("falls back fully when params are empty", () => {
    const result = parseCalendarUrlState(new URLSearchParams(""), FIXED_NOW)
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })
})

describe("parseCalendarUrlState — plain object input", () => {
  it("parses plain object with view and date", () => {
    const result = parseCalendarUrlState(
      { view: "week", date: "2025-05-07" },
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "week", date: "2025-05-07" })
  })

  it("falls back on null values", () => {
    const result = parseCalendarUrlState(
      { view: null, date: null },
      FIXED_NOW,
    )
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })

  it("falls back on undefined values", () => {
    const result = parseCalendarUrlState({}, FIXED_NOW)
    expect(result).toEqual({ view: "month", date: SGT_TODAY })
  })
})

describe("serializeCalendarUrlState", () => {
  it("serializes week view correctly", () => {
    const result = serializeCalendarUrlState({ view: "week", date: "2025-05-07" })
    expect(result).toBe("view=week&date=2025-05-07")
  })

  it("serializes month view correctly", () => {
    const result = serializeCalendarUrlState({ view: "month", date: "2025-05-01" })
    expect(result).toBe("view=month&date=2025-05-01")
  })

  it("serializes day view correctly", () => {
    const result = serializeCalendarUrlState({ view: "day", date: "2025-05-07" })
    expect(result).toBe("view=day&date=2025-05-07")
  })

  it("does not include a leading ?", () => {
    const result = serializeCalendarUrlState({ view: "month", date: "2025-05-07" })
    expect(result.startsWith("?")).toBe(false)
  })

  it("always emits both keys", () => {
    const result = serializeCalendarUrlState({ view: "day", date: "2025-05-07" })
    expect(result).toContain("view=")
    expect(result).toContain("date=")
  })
})

describe("round-trip: serialize then parse", () => {
  const cases: CalendarUrlState[] = [
    { view: "month", date: "2025-05-01" },
    { view: "week", date: "2025-05-07" },
    { view: "day", date: "2025-12-31" },
    { view: "month", date: "2024-02-29" },
  ]

  for (const state of cases) {
    it(`round-trips ${state.view}/${state.date}`, () => {
      const serialized = serializeCalendarUrlState(state)
      const parsed = parseCalendarUrlState(
        new URLSearchParams(serialized),
        FIXED_NOW,
      )
      expect(parsed).toEqual(state)
    })
  }
})
