// @vitest-environment happy-dom
// Tests for SessionIndicator — pure presentational component.
// Pattern mirrors slot-picker.test.tsx: createRoot harness, no @testing-library/react.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { SessionIndicator, type SessionIndicatorProps } from "../SessionIndicator"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(container: HTMLElement, props: SessionIndicatorProps): Root {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(SessionIndicator, props))
  })
  return root
}

describe("SessionIndicator", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => {
      // unmount to avoid act() warnings
    })
    document.body.removeChild(container)
  })

  // ---------------------------------------------------------------------------
  // 1. Zero counts → renders null
  // ---------------------------------------------------------------------------
  it("renders null when confirmed=0 and pending=0", () => {
    render(container, { confirmed: 0, pending: 0, variant: "month" })
    expect(container.firstChild).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // 2. Confirmed > 0 → text "3", cyan dot
  // ---------------------------------------------------------------------------
  it("shows count '3' and cyan dot when confirmed=3, pending=0", () => {
    render(container, { confirmed: 3, pending: 0, variant: "week" })

    const text = container.textContent ?? ""
    expect(text).toContain("3")

    // Find a span with inline background cyan
    const allSpans = Array.from(container.querySelectorAll("span"))
    const cyanSpan = allSpans.find((el) =>
      (el as HTMLElement).style.background.includes("rgb(0, 198, 212)") ||
      (el as HTMLElement).style.background.includes("#00C6D4") ||
      (el as HTMLElement).style.backgroundColor.includes("rgb(0, 198, 212)")
    )
    expect(cyanSpan).not.toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 3. Only pending → text "2", amber dot
  // ---------------------------------------------------------------------------
  it("shows count '2' and amber dot when confirmed=0, pending=2", () => {
    render(container, { confirmed: 0, pending: 2, variant: "week" })

    const text = container.textContent ?? ""
    expect(text).toContain("2")

    const allSpans = Array.from(container.querySelectorAll("span"))
    const amberSpan = allSpans.find((el) =>
      (el as HTMLElement).style.background.includes("rgb(255, 179, 71)") ||
      (el as HTMLElement).style.background.includes("#FFB347") ||
      (el as HTMLElement).style.backgroundColor.includes("rgb(255, 179, 71)")
    )
    expect(amberSpan).not.toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 4. Confirmed dominates → sum shown, cyan dot
  // ---------------------------------------------------------------------------
  it("shows sum '3' and cyan dot when confirmed=2, pending=1", () => {
    render(container, { confirmed: 2, pending: 1, variant: "week" })

    const text = container.textContent ?? ""
    expect(text).toContain("3")

    const allSpans = Array.from(container.querySelectorAll("span"))
    const cyanSpan = allSpans.find((el) =>
      (el as HTMLElement).style.background.includes("rgb(0, 198, 212)") ||
      (el as HTMLElement).style.background.includes("#00C6D4") ||
      (el as HTMLElement).style.backgroundColor.includes("rgb(0, 198, 212)")
    )
    expect(cyanSpan).not.toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // 5. variant="month" dot is narrower than variant="week" dot
  // ---------------------------------------------------------------------------
  it("month variant dot is narrower than week variant dot", () => {
    // Render month variant
    render(container, { confirmed: 1, pending: 0, variant: "month" })
    const monthSpans = Array.from(container.querySelectorAll("span"))
    const monthDot = monthSpans.find((el) => {
      const s = (el as HTMLElement).style
      return (
        s.background.includes("rgb(0, 198, 212)") ||
        s.background.includes("#00C6D4") ||
        s.backgroundColor.includes("rgb(0, 198, 212)")
      )
    }) as HTMLElement | undefined
    expect(monthDot).not.toBeUndefined()
    const monthWidth = parseInt(monthDot!.style.width, 10)

    // Re-render as week variant in a fresh container
    const c2 = document.createElement("div")
    document.body.appendChild(c2)
    const root2 = createRoot(c2)
    act(() => {
      root2.render(React.createElement(SessionIndicator, { confirmed: 1, pending: 0, variant: "week" }))
    })
    const weekSpans = Array.from(c2.querySelectorAll("span"))
    const weekDot = weekSpans.find((el) => {
      const s = (el as HTMLElement).style
      return (
        s.background.includes("rgb(0, 198, 212)") ||
        s.background.includes("#00C6D4") ||
        s.backgroundColor.includes("rgb(0, 198, 212)")
      )
    }) as HTMLElement | undefined
    expect(weekDot).not.toBeUndefined()
    const weekWidth = parseInt(weekDot!.style.width, 10)

    expect(monthWidth).toBeLessThan(weekWidth)

    document.body.removeChild(c2)
  })
})
