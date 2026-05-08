// @vitest-environment happy-dom
// Tests for MonthCell — single day cell in the month grid.
// Pattern mirrors slot-picker.test.tsx: createRoot harness, no @testing-library/react.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot } from "react-dom/client"
import { act } from "react"
import { MonthCell, type MonthCellProps } from "../MonthCell"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(container: HTMLElement, props: MonthCellProps): void {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(MonthCell, props))
  })
}

const baseProps: MonthCellProps = {
  dateStr: "2025-05-07",
  dayNum: 7,
  isToday: false,
  isSelected: false,
  isOutsideMonth: false,
  isBlocked: false,
  confirmedCount: 0,
  pendingCount: 0,
  onTap: () => {},
}

describe("MonthCell", () => {
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
  // 1. Renders day number
  // ---------------------------------------------------------------------------
  it("renders the dayNum prop as visible text", () => {
    render(container, { ...baseProps, dayNum: 14 })
    expect(container.textContent).toContain("14")
  })

  // ---------------------------------------------------------------------------
  // 2. isToday=true → cyan circle + aria-current="date"
  // ---------------------------------------------------------------------------
  it("renders cyan circle and aria-current='date' when isToday=true", () => {
    render(container, { ...baseProps, isToday: true })

    const btn = container.querySelector("button") as HTMLButtonElement
    expect(btn.getAttribute("aria-current")).toBe("date")

    // Find element with cyan background
    const allEls = Array.from(container.querySelectorAll("*")) as HTMLElement[]
    const cyanEl = allEls.find((el) =>
      el.style.background.includes("rgb(0, 198, 212)") ||
      el.style.background.includes("#00C6D4") ||
      el.style.backgroundColor.includes("rgb(0, 198, 212)")
    )
    expect(cyanEl).not.toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 3. isSelected=true, isToday=false → cyan underline at bottom
  // ---------------------------------------------------------------------------
  it("renders a cyan underline div when isSelected=true and isToday=false", () => {
    render(container, { ...baseProps, isSelected: true, isToday: false })

    const allDivs = Array.from(container.querySelectorAll("div")) as HTMLElement[]
    const underline = allDivs.find((el) => {
      const s = el.style
      return (
        s.background.includes("rgb(0, 198, 212)") ||
        s.background.includes("#00C6D4") ||
        s.backgroundColor.includes("rgb(0, 198, 212)")
      ) && (
        s.height === "2px" ||
        el.className.includes("bottom") ||
        s.position === "absolute"
      )
    })
    expect(underline).not.toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 4. isOutsideMonth=true → reduced opacity on day number
  // ---------------------------------------------------------------------------
  it("shows reduced opacity on outside-month day number", () => {
    render(container, { ...baseProps, isOutsideMonth: true })

    // Look for any element whose inline opacity is set to a low value
    const allEls = Array.from(container.querySelectorAll("*")) as HTMLElement[]
    const fadedEl = allEls.find((el) => {
      const op = parseFloat(el.style.opacity)
      return !isNaN(op) && op < 1
    })
    // Also accept a Tailwind opacity class
    const hasTailwindOpacity = container.innerHTML.includes("opacity-")
    expect(fadedEl !== undefined || hasTailwindOpacity).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // 5. isBlocked=true → rose background, aria-label contains "blocked"
  // ---------------------------------------------------------------------------
  it("has rose background and aria-label 'blocked' when isBlocked=true", () => {
    render(container, { ...baseProps, isBlocked: true })

    const btn = container.querySelector("button") as HTMLButtonElement
    const bg = btn.style.background || btn.style.backgroundColor

    // Accept rgba(225, 29, 72, ...) in any whitespace format
    expect(bg.replace(/\s+/g, " ")).toMatch(/rgba\(225,?\s?29,?\s?72/)

    expect(btn.getAttribute("aria-label") ?? "").toContain("blocked")
  })

  // ---------------------------------------------------------------------------
  // 6. Tapping fires onTap with dateStr
  // ---------------------------------------------------------------------------
  it("fires onTap(dateStr) when button is clicked", () => {
    const spy = vi.fn()
    render(container, { ...baseProps, dateStr: "2025-05-07", onTap: spy })

    const btn = container.querySelector("button") as HTMLButtonElement
    act(() => {
      btn.click()
    })

    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith("2025-05-07")
  })

  // ---------------------------------------------------------------------------
  // 7. aria-label includes day name, day number, month name
  // ---------------------------------------------------------------------------
  it("aria-label contains day name, day number and month name", () => {
    render(container, { ...baseProps, dateStr: "2025-05-07", dayNum: 7 })
    const btn = container.querySelector("button") as HTMLButtonElement
    const label = btn.getAttribute("aria-label") ?? ""

    // "Wednesday" for 2025-05-07
    expect(label).toMatch(/Wednesday/i)
    expect(label).toContain("7")
    expect(label).toMatch(/May/i)
  })

  // ---------------------------------------------------------------------------
  // 8. button has min-height >= 48px via inline style
  // ---------------------------------------------------------------------------
  it("button min-height is at least 48px", () => {
    render(container, baseProps)
    const btn = container.querySelector("button") as HTMLButtonElement
    const minH = parseInt(btn.style.minHeight, 10)
    expect(minH).toBeGreaterThanOrEqual(48)
  })

  // ---------------------------------------------------------------------------
  // 9. Zero counts → no SessionIndicator markup
  // ---------------------------------------------------------------------------
  it("renders no session indicator when confirmedCount=0 and pendingCount=0", () => {
    render(container, { ...baseProps, confirmedCount: 0, pendingCount: 0 })

    // SessionIndicator returns null for zero counts — verify no count text
    // The button still contains the day number; count text would be a digit rendered by the indicator
    // We check that no extra numeric text beyond the day number exists.
    // A reliable signal: no dot-sized span with cyan/amber background
    const allSpans = Array.from(container.querySelectorAll("span")) as HTMLElement[]
    const dotSpan = allSpans.find((el) => {
      const s = el.style
      return (
        s.background.includes("rgb(0, 198, 212)") ||
        s.background.includes("#00C6D4") ||
        s.background.includes("#FFB347") ||
        s.background.includes("rgb(255, 179, 71)")
      )
    })
    expect(dotSpan).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 10. Non-zero counts → SessionIndicator renders the sum
  // ---------------------------------------------------------------------------
  it("SessionIndicator renders '3' total when confirmedCount=2, pendingCount=1", () => {
    render(container, { ...baseProps, confirmedCount: 2, pendingCount: 1 })
    expect(container.textContent).toContain("3")
  })

  // ---------------------------------------------------------------------------
  // 11. aria-pressed=true when isSelected=true
  // ---------------------------------------------------------------------------
  it("button has aria-pressed='true' when isSelected=true", () => {
    render(container, { ...baseProps, isSelected: true })
    const btn = container.querySelector("button") as HTMLButtonElement
    expect(btn.getAttribute("aria-pressed")).toBe("true")
  })
})
