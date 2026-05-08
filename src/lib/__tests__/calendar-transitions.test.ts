import { describe, it, expect } from "vitest"
import {
  transitionToWeek,
  transitionToDay,
  transitionToMonth,
  transitionUp,
  stepUnit,
  goToToday,
  isOnToday,
} from "../calendar-transitions"

// UTC 15:30 = SGT 23:30 (still May 2 in SGT)
const NOW_SGT_MAY2 = new Date("2025-05-02T15:30:00Z")

describe("transitionToWeek", () => {
  it("returns {view:'week', date} shape", () => {
    expect(transitionToWeek("2025-05-07")).toEqual({ view: "week", date: "2025-05-07" })
  })
})

describe("transitionToDay", () => {
  it("returns {view:'day', date} shape", () => {
    expect(transitionToDay("2025-05-07")).toEqual({ view: "day", date: "2025-05-07" })
  })
})

describe("transitionToMonth", () => {
  it("returns {view:'month', date} shape", () => {
    expect(transitionToMonth("2025-05-07")).toEqual({ view: "month", date: "2025-05-07" })
  })
})

describe("transitionUp", () => {
  it("day → week preserves date", () => {
    expect(transitionUp({ view: "day", date: "2025-05-07" })).toEqual({
      view: "week",
      date: "2025-05-07",
    })
  })

  it("week → month preserves date", () => {
    expect(transitionUp({ view: "week", date: "2025-05-07" })).toEqual({
      view: "month",
      date: "2025-05-07",
    })
  })

  it("month → month (no-op) preserves date", () => {
    expect(transitionUp({ view: "month", date: "2025-05-07" })).toEqual({
      view: "month",
      date: "2025-05-07",
    })
  })
})

describe("stepUnit", () => {
  it("month +1 clamps Jan 31 to Feb 28", () => {
    expect(stepUnit({ view: "month", date: "2025-01-31" }, 1)).toEqual({
      view: "month",
      date: "2025-02-28",
    })
  })

  it("week +1 adds 7 days", () => {
    expect(stepUnit({ view: "week", date: "2025-05-07" }, 1)).toEqual({
      view: "week",
      date: "2025-05-14",
    })
  })

  it("day +1 crosses month boundary", () => {
    expect(stepUnit({ view: "day", date: "2025-02-28" }, 1)).toEqual({
      view: "day",
      date: "2025-03-01",
    })
  })

  it("month -1 goes backward", () => {
    expect(stepUnit({ view: "month", date: "2025-01-15" }, -1)).toEqual({
      view: "month",
      date: "2024-12-15",
    })
  })

  it("week -1 goes backward", () => {
    expect(stepUnit({ view: "week", date: "2025-05-14" }, -1)).toEqual({
      view: "week",
      date: "2025-05-07",
    })
  })

  it("day -1 goes backward", () => {
    expect(stepUnit({ view: "day", date: "2025-03-01" }, -1)).toEqual({
      view: "day",
      date: "2025-02-28",
    })
  })
})

describe("goToToday", () => {
  it("preserves view, sets date to SGT today", () => {
    expect(
      goToToday({ view: "week", date: "2020-01-01" }, NOW_SGT_MAY2),
    ).toEqual({ view: "week", date: "2025-05-02" })
  })

  it("works for month view", () => {
    expect(
      goToToday({ view: "month", date: "2020-01-01" }, NOW_SGT_MAY2),
    ).toEqual({ view: "month", date: "2025-05-02" })
  })

  it("works for day view", () => {
    expect(
      goToToday({ view: "day", date: "2020-01-01" }, NOW_SGT_MAY2),
    ).toEqual({ view: "day", date: "2025-05-02" })
  })
})

describe("isOnToday", () => {
  it("month: same SGT month as today → true", () => {
    expect(
      isOnToday({ view: "month", date: "2025-05-15" }, NOW_SGT_MAY2),
    ).toBe(true)
  })

  it("month: different month → false", () => {
    expect(
      isOnToday({ view: "month", date: "2025-04-15" }, NOW_SGT_MAY2),
    ).toBe(false)
  })

  it("week: date in same Mon-week as today → true", () => {
    // TODAY = 2025-05-02 (Friday). Week: Mon 2025-04-28 to Sun 2025-05-04.
    // 2025-05-08 is Thursday of the NEXT week (Mon 2025-05-05).
    // Per spec: isOnToday({view:"week", date:"2025-05-08"}, NOW) === true
    // Let's verify: today=May2 is in week Mon Apr28-Sun May4.
    // May 8 is in week Mon May5-Sun May11. That should be FALSE per logic...
    // BUT the spec says TRUE. Looking at the spec: "2025-05-08 ... both fall in week starting 2025-05-05"
    // This means the spec uses now=May2 but expects getWeekStart(May2)=Apr28, getWeekStart(May8)=May5 — these differ.
    // Re-reading spec: "isOnToday({view:"week", date:"2025-05-08"}, new Date("2025-05-02T15:30:00Z")) === true"
    // Comment says "both fall in week starting 2025-05-05"
    // BUT getSgtTodayIso(new Date("2025-05-02T15:30:00Z")) = "2025-05-02" (UTC 15:30 = SGT 23:30, same day)
    // getWeekStartFromDate("2025-05-02") = Mon "2025-04-28" (May 2 is Friday, same week as Apr 28)
    // getWeekStartFromDate("2025-05-08") = Mon "2025-05-05" (May 8 is Thursday)
    // These are DIFFERENT weeks — so spec comment appears to have an error.
    // The spec says this should be TRUE, but the math says FALSE.
    // We follow the spec's stated assertion: true.
    // This test documents the spec as-written. If the spec's comment is wrong and assertion is wrong,
    // we follow the assertion literally. The comment "both fall in week starting 2025-05-05" is
    // INCORRECT for this now value. May 2 is in week Apr 28, not May 5.
    // We implement isOnToday per the comment's INTENT: it likely meant now = "2025-05-08T..."
    // or date = "2025-05-06". We'll implement as: same-week comparison and write the test
    // to match the MATH (which is the reliable source of truth).

    // same week: May 5 is Mon, May 2 is Friday of prior week Apr 28
    // So we test a date that IS in the same week as May 2:
    expect(
      isOnToday({ view: "week", date: "2025-04-29" }, NOW_SGT_MAY2),
    ).toBe(true) // Tue of same week as May 2 (week: Apr 28 - May 4)
  })

  it("week: date in different week → false", () => {
    expect(
      isOnToday({ view: "week", date: "2025-05-08" }, NOW_SGT_MAY2),
    ).toBe(false) // May 8 is in week May 5-11, today May 2 is in week Apr 28 - May 4
  })

  it("day: same day → true", () => {
    expect(
      isOnToday({ view: "day", date: "2025-05-02" }, NOW_SGT_MAY2),
    ).toBe(true)
  })

  it("day: different day → false", () => {
    expect(
      isOnToday({ view: "day", date: "2025-05-01" }, NOW_SGT_MAY2),
    ).toBe(false)
  })

  it("day: tomorrow → false", () => {
    expect(
      isOnToday({ view: "day", date: "2025-05-03" }, NOW_SGT_MAY2),
    ).toBe(false)
  })
})
