import { describe, it, expect, beforeAll, afterAll } from "vitest"
import {
  getSgtTodayIso,
  parseIsoDateStrict,
  getMonthGridStart,
  getMonthGrid,
  getWeekStartFromDate,
  addMonthsSgt,
  addDaysIso,
  addWeeksIso,
  isSameMonthIso,
} from "../calendar-grid"

describe("getSgtTodayIso", () => {
  it("returns SGT date when UTC time is still same calendar day in SGT", () => {
    // UTC 15:30 = SGT 23:30 (same day May 2)
    expect(getSgtTodayIso(new Date("2025-05-02T15:30:00Z"))).toBe("2025-05-02")
  })

  it("returns next SGT day when UTC time crosses midnight in SGT", () => {
    // UTC 16:30 = SGT 00:30 (next day May 3)
    expect(getSgtTodayIso(new Date("2025-05-02T16:30:00Z"))).toBe("2025-05-03")
  })

  it("defaults to current Date when no argument provided", () => {
    const result = getSgtTodayIso()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe("parseIsoDateStrict", () => {
  it("returns a Date for a valid date string", () => {
    expect(parseIsoDateStrict("2025-05-07")).toBeInstanceOf(Date)
  })

  it("returns null for Feb 30 (impossible date)", () => {
    expect(parseIsoDateStrict("2025-02-30")).toBeNull()
  })

  it("returns null for month 13", () => {
    expect(parseIsoDateStrict("2025-13-01")).toBeNull()
  })

  it("returns null for non-date string", () => {
    expect(parseIsoDateStrict("abc")).toBeNull()
  })

  it("returns a Date for 2024-02-29 (valid leap year)", () => {
    expect(parseIsoDateStrict("2024-02-29")).toBeInstanceOf(Date)
  })

  it("returns null for 2025-02-29 (non-leap year)", () => {
    expect(parseIsoDateStrict("2025-02-29")).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseIsoDateStrict("")).toBeNull()
  })

  it("returns null for wrong format", () => {
    expect(parseIsoDateStrict("05-07-2025")).toBeNull()
  })
})

describe("getMonthGridStart", () => {
  it("returns 2024-12-30 for Jan 2025 anchor (Mon of week containing Jan 1)", () => {
    expect(getMonthGridStart("2025-01-15")).toBe("2024-12-30")
  })

  it("returns 2025-01-27 for Feb 2025 anchor", () => {
    expect(getMonthGridStart("2025-02-15")).toBe("2025-01-27")
  })

  it("returns 2025-04-28 for May 2025 anchor", () => {
    expect(getMonthGridStart("2025-05-15")).toBe("2025-04-28")
  })

  it("throws on invalid anchor string", () => {
    expect(() => getMonthGridStart("invalid")).toThrow()
  })
})

describe("getMonthGrid", () => {
  it("always returns exactly 42 entries", () => {
    expect(getMonthGrid("2025-02-15")).toHaveLength(42)
    expect(getMonthGrid("2025-05-15")).toHaveLength(42)
    expect(getMonthGrid("2024-02-15")).toHaveLength(42)
  })

  it("Feb 2025: first cell is 2025-01-27, last cell is 2025-03-09", () => {
    const grid = getMonthGrid("2025-02-15")
    expect(grid[0]).toBe("2025-01-27")
    expect(grid[41]).toBe("2025-03-09")
  })

  it("Feb 2024 (leap): grid includes 2024-02-29 exactly once", () => {
    const grid = getMonthGrid("2024-02-15")
    const count = grid.filter((d) => d === "2024-02-29").length
    expect(count).toBe(1)
  })

  it("Feb 2028 (next leap): grid includes 2028-02-29 (formula not hardcoded)", () => {
    const grid = getMonthGrid("2028-02-15")
    expect(grid).toContain("2028-02-29")
  })

  it("Dec 2024: last cell is in Jan 2025", () => {
    const grid = getMonthGrid("2024-12-15")
    const lastDate = grid[41]
    expect(lastDate.startsWith("2025-01")).toBe(true)
  })

  it("Jan 2025: first cell is in Dec 2024", () => {
    const grid = getMonthGrid("2025-01-15")
    expect(grid[0].startsWith("2024-12")).toBe(true)
  })

  it("all entries are in YYYY-MM-DD format", () => {
    const grid = getMonthGrid("2025-05-15")
    for (const d of grid) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it("entries are consecutive days", () => {
    const grid = getMonthGrid("2025-05-15")
    for (let i = 1; i < grid.length; i++) {
      const prev = new Date(grid[i - 1] + "T00:00:00Z")
      const curr = new Date(grid[i] + "T00:00:00Z")
      expect(curr.getTime() - prev.getTime()).toBe(86400000)
    }
  })
})

describe("getWeekStartFromDate", () => {
  it("Wed returns Mon of same week", () => {
    expect(getWeekStartFromDate("2025-05-07")).toBe("2025-05-05")
  })

  it("Mon returns itself", () => {
    expect(getWeekStartFromDate("2025-05-05")).toBe("2025-05-05")
  })

  it("Sun returns prior Mon", () => {
    expect(getWeekStartFromDate("2025-05-04")).toBe("2025-04-28")
  })

  it("Sat returns Mon of same week", () => {
    // 2025-05-10 is a Saturday
    expect(getWeekStartFromDate("2025-05-10")).toBe("2025-05-05")
  })

  it("Tue returns Mon of same week", () => {
    // 2025-05-06 is a Tuesday
    expect(getWeekStartFromDate("2025-05-06")).toBe("2025-05-05")
  })
})

describe("addMonthsSgt", () => {
  it("clamps Jan 31 + 1 month to Feb 28 (non-leap)", () => {
    expect(addMonthsSgt("2025-01-31", 1)).toBe("2025-02-28")
  })

  it("clamps Jan 31 + 1 month to Feb 29 (leap year 2024)", () => {
    expect(addMonthsSgt("2024-01-31", 1)).toBe("2024-02-29")
  })

  it("crosses year boundary Dec 15 + 1 = Jan 15", () => {
    expect(addMonthsSgt("2025-12-15", 1)).toBe("2026-01-15")
  })

  it("goes backward Jan 15 - 1 = Dec 15 prior year", () => {
    expect(addMonthsSgt("2025-01-15", -1)).toBe("2024-12-15")
  })

  it("delta 0 returns same date", () => {
    expect(addMonthsSgt("2025-05-15", 0)).toBe("2025-05-15")
  })

  it("delta 12 crosses full year", () => {
    expect(addMonthsSgt("2025-05-15", 12)).toBe("2026-05-15")
  })
})

describe("addDaysIso", () => {
  it("advances past month boundary", () => {
    expect(addDaysIso("2025-02-28", 1)).toBe("2025-03-01")
  })

  it("advances past year boundary", () => {
    expect(addDaysIso("2025-12-31", 1)).toBe("2026-01-01")
  })

  it("goes backward", () => {
    expect(addDaysIso("2025-03-01", -1)).toBe("2025-02-28")
  })

  it("delta 0 returns same", () => {
    expect(addDaysIso("2025-05-07", 0)).toBe("2025-05-07")
  })
})

describe("addWeeksIso", () => {
  it("adds 1 week correctly", () => {
    expect(addWeeksIso("2025-05-05", 1)).toBe("2025-05-12")
  })

  it("subtracts 1 week correctly", () => {
    expect(addWeeksIso("2025-05-12", -1)).toBe("2025-05-05")
  })

  it("crosses month boundary", () => {
    expect(addWeeksIso("2025-05-28", 1)).toBe("2025-06-04")
  })
})

describe("isSameMonthIso", () => {
  it("two dates in same month return true", () => {
    expect(isSameMonthIso("2025-05-01", "2025-05-31")).toBe(true)
  })

  it("dates in adjacent months return false", () => {
    expect(isSameMonthIso("2025-05-31", "2025-06-01")).toBe(false)
  })

  it("same date returns true", () => {
    expect(isSameMonthIso("2025-05-15", "2025-05-15")).toBe(true)
  })

  it("same day different year returns false", () => {
    expect(isSameMonthIso("2024-05-15", "2025-05-15")).toBe(false)
  })
})

describe.concurrent("DST trap: runner in America/New_York, SGT math stays correct", () => {
  const originalTZ = process.env.TZ

  beforeAll(() => {
    process.env.TZ = "America/New_York"
  })

  afterAll(() => {
    if (originalTZ === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTZ
    }
  })

  it("getSgtTodayIso still returns SGT date ignoring runner TZ", () => {
    // UTC 16:30 = SGT 00:30 next day regardless of runner TZ
    expect(getSgtTodayIso(new Date("2025-05-02T16:30:00Z"))).toBe("2025-05-03")
  })

  it("getMonthGridStart still returns correct Mon-anchored start", () => {
    expect(getMonthGridStart("2025-05-15")).toBe("2025-04-28")
  })

  it("getMonthGrid still returns 42 entries with correct first cell", () => {
    const grid = getMonthGrid("2025-02-15")
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe("2025-01-27")
  })

  it("getWeekStartFromDate still returns Mon from Sun", () => {
    expect(getWeekStartFromDate("2025-05-04")).toBe("2025-04-28")
  })
})
