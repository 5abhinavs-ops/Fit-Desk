// @vitest-environment happy-dom
// Tests for CalendarNav — header nav with breadcrumb + prev/next/today.
// Pattern mirrors slot-picker.test.tsx: createRoot harness, no @testing-library/react.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { CalendarNav, type CalendarNavProps } from "../CalendarNav"
import type { CalendarView } from "@/lib/calendar-url"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(container: HTMLElement, props: CalendarNavProps): void {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(CalendarNav, props))
  })
}

const noop = () => {}

// Helper — find buttons by text content substring
function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((btn) =>
    btn.textContent?.includes(text)
  ) as HTMLButtonElement | undefined
}

describe("CalendarNav", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // 1. view="month" → single breadcrumb segment containing month name
  // ---------------------------------------------------------------------------
  it("month view shows single breadcrumb with month name as plain text", () => {
    render(container, {
      view: "month",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange: noop,
      onPrev: noop,
      onNext: noop,
      onToday: noop,
    })

    const text = container.textContent ?? ""
    expect(text).toMatch(/May/i)
    expect(text).toMatch(/2025/)

    // The month segment should NOT be a button in month view
    const buttons = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]
    const monthBtn = buttons.find((b) => b.textContent?.includes("May"))
    expect(monthBtn).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 2. view="week" → two breadcrumb segments; first is a button with month name
  // ---------------------------------------------------------------------------
  it("week view shows two breadcrumb segments; month is a button", () => {
    const onViewChange = vi.fn()
    render(container, {
      view: "week",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange,
      onPrev: noop,
      onNext: noop,
      onToday: noop,
    })

    const text = container.textContent ?? ""
    expect(text).toMatch(/May/i)

    // Month name is clickable
    const monthBtn = findButtonByText(container, "May")
    expect(monthBtn).not.toBeUndefined()

    act(() => {
      monthBtn!.click()
    })
    expect(onViewChange).toHaveBeenCalledWith("month" satisfies CalendarView)
  })

  // ---------------------------------------------------------------------------
  // 3. view="day" → three segments; first two are buttons
  // ---------------------------------------------------------------------------
  it("day view has three breadcrumb segments; first two are buttons", () => {
    const onViewChange = vi.fn()
    render(container, {
      view: "day",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange,
      onPrev: noop,
      onNext: noop,
      onToday: noop,
    })

    // Clicking the "week" segment fires onViewChange("week")
    // The week breadcrumb segment text should contain "May" or "week of"
    // We find navigation breadcrumb buttons (not prev/next which have aria-labels)
    const allBtns = Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]
    const breadcrumbBtns = allBtns.filter(
      (b) => !b.getAttribute("aria-label")?.match(/Previous|Next|Today/i)
    )
    // Should have at least 2 breadcrumb buttons (month + week level)
    expect(breadcrumbBtns.length).toBeGreaterThanOrEqual(2)

    // Find the week-level button (second breadcrumb) and click it
    const weekBtn = breadcrumbBtns[1]
    act(() => {
      weekBtn.click()
    })
    expect(onViewChange).toHaveBeenCalledWith("week" satisfies CalendarView)
  })

  // ---------------------------------------------------------------------------
  // 4. Prev button fires onPrev; aria-label contains unit name
  // ---------------------------------------------------------------------------
  it("prev button fires onPrev and has aria-label with unit", () => {
    const onPrev = vi.fn()
    render(container, {
      view: "month",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange: noop,
      onPrev,
      onNext: noop,
      onToday: noop,
    })

    const prevBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      /previous/i.test(b.getAttribute("aria-label") ?? "")
    ) as HTMLButtonElement | undefined
    expect(prevBtn).not.toBeUndefined()
    expect(prevBtn!.getAttribute("aria-label")).toMatch(/month/i)

    act(() => { prevBtn!.click() })
    expect(onPrev).toHaveBeenCalledOnce()
  })

  // ---------------------------------------------------------------------------
  // 5. Next button fires onNext
  // ---------------------------------------------------------------------------
  it("next button fires onNext", () => {
    const onNext = vi.fn()
    render(container, {
      view: "week",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange: noop,
      onPrev: noop,
      onNext,
      onToday: noop,
    })

    const nextBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      /next/i.test(b.getAttribute("aria-label") ?? "")
    ) as HTMLButtonElement | undefined
    expect(nextBtn).not.toBeUndefined()

    act(() => { nextBtn!.click() })
    expect(onNext).toHaveBeenCalledOnce()
  })

  // ---------------------------------------------------------------------------
  // 6. isOnTodayUnit=true → no "Today" button
  // ---------------------------------------------------------------------------
  it("does not render Today button when isOnTodayUnit=true", () => {
    render(container, {
      view: "month",
      date: "2025-05-07",
      isOnTodayUnit: true,
      onViewChange: noop,
      onPrev: noop,
      onNext: noop,
      onToday: noop,
    })

    const todayBtn = findButtonByText(container, "Today")
    expect(todayBtn).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 7. isOnTodayUnit=false → "Today" button rendered, fires onToday
  // ---------------------------------------------------------------------------
  it("renders Today button when isOnTodayUnit=false and fires onToday on click", () => {
    const onToday = vi.fn()
    render(container, {
      view: "month",
      date: "2025-04-07",
      isOnTodayUnit: false,
      onViewChange: noop,
      onPrev: noop,
      onNext: noop,
      onToday,
    })

    const todayBtn = findButtonByText(container, "Today")
    expect(todayBtn).not.toBeUndefined()

    act(() => { todayBtn!.click() })
    expect(onToday).toHaveBeenCalledOnce()
  })
})
