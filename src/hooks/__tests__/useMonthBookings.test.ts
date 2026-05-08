/**
 * useMonthBookings — pure-logic tests
 *
 * Tests the exported helper functions getMonthQueryKey and getMonthRange
 * without spinning up QueryClient or a DOM environment.
 * The actual useQuery call is thin and exercised by integration at the page level.
 */

import { describe, it, expect } from "vitest"
import { getMonthQueryKey, getMonthRange } from "../useMonthBookings"
import { getMonthGridStart } from "@/lib/calendar-grid"

describe("getMonthQueryKey", () => {
  it("first element is always 'monthBookings'", () => {
    expect(getMonthQueryKey("2025-05-15")[0]).toBe("monthBookings")
  })

  it("second element equals getMonthGridStart of the anchor", () => {
    expect(getMonthQueryKey("2025-05-15")[1]).toBe(
      getMonthGridStart("2025-05-15"),
    )
    // getMonthGridStart("2025-05-15") → "2025-04-28"
    expect(getMonthQueryKey("2025-05-15")[1]).toBe("2025-04-28")
  })

  it("two anchors in the same month return the same cache key", () => {
    const keyFirst = getMonthQueryKey("2025-05-01")[1]
    const keyLast = getMonthQueryKey("2025-05-31")[1]
    expect(keyFirst).toBe(keyLast)
  })

  it("adjacent months produce different keys — deterministic values", () => {
    const keyApr30 = getMonthQueryKey("2025-04-30")
    const keyMay01 = getMonthQueryKey("2025-05-01")
    // Different months → different grids → different keys
    expect(keyApr30[1]).not.toBe(keyMay01[1])
    // Apr grid starts on Mon 2025-03-31
    expect(keyApr30[1]).toBe("2025-03-31")
    // May grid starts on Mon 2025-04-28
    expect(keyMay01[1]).toBe("2025-04-28")
  })

  it("throws on invalid anchor string", () => {
    expect(() => getMonthQueryKey("not-a-date")).toThrow()
  })

  it("throws on empty string", () => {
    expect(() => getMonthQueryKey("")).toThrow()
  })

  it("return type is readonly tuple", () => {
    const key = getMonthQueryKey("2025-05-15")
    expect(key).toHaveLength(2)
  })
})

describe("getMonthRange", () => {
  it("returns correct gridStart and gridEnd for May 2025", () => {
    // getMonthGridStart("2025-05-15") → "2025-04-28"
    // gridEnd = addDaysIso("2025-04-28", 41) → 28 Apr + 41 days = 8 Jun
    const { gridStart, gridEnd } = getMonthRange("2025-05-15")
    expect(gridStart).toBe("2025-04-28")
    expect(gridEnd).toBe("2025-06-08")
  })

  it("returns correct range for Feb 2024 (leap year)", () => {
    // getMonthGridStart("2024-02-15"):
    //   Feb 1 2024 is a Thursday (DOW=4), ISO offset=3 → Mon Jan 29 2024
    // gridEnd = addDaysIso("2024-01-29", 41) = Mar 10 2024
    const { gridStart, gridEnd } = getMonthRange("2024-02-15")
    expect(gridStart).toBe("2024-01-29")
    expect(gridEnd).toBe("2024-03-10")
  })

  it("gridEnd crosses into the next year for Dec 2025", () => {
    // getMonthGridStart("2025-12-15"):
    //   Dec 1 2025 is a Monday → gridStart = "2025-12-01"
    // gridEnd = addDaysIso("2025-12-01", 41) = Jan 11 2026
    const { gridStart, gridEnd } = getMonthRange("2025-12-15")
    expect(gridStart).toBe("2025-12-01")
    expect(gridEnd).toBe("2026-01-11")
  })

  it("gridEnd is exactly 41 days after gridStart", () => {
    const { gridStart, gridEnd } = getMonthRange("2025-05-15")
    // Verify the distance is 41 days by checking the raw date arithmetic
    const startMs = new Date(`${gridStart}T12:00:00Z`).getTime()
    const endMs = new Date(`${gridEnd}T12:00:00Z`).getTime()
    const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(41)
  })

  it("throws on invalid anchor string", () => {
    expect(() => getMonthRange("not-a-date")).toThrow()
  })
})
