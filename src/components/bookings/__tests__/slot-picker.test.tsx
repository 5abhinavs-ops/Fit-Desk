// @vitest-environment happy-dom
// Uses happy-dom because SlotPicker mounts DOM elements via createRoot and
// the test queries them directly. The default vitest environment is node,
// which has no DOM APIs.
//
// Render strategy: mirrors payment-status-card.test.tsx — no @testing-library/react.
// A minimal createRoot harness renders the component and the DOM is queried
// directly via container.querySelector / container.textContent.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { SlotPicker, type SlotPickerProps } from "../slot-picker"

// React 19 act() requires this flag in non-jsdom test environments.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ---------------------------------------------------------------------------
// SlotPicker does NOT import useReducedMotion — the D3 implementation uses
// Tailwind motion-reduce: variants instead. No hook mock required.
// SlotPickerProps is imported from the production module so test signatures
// stay locked to the real interface (drift would be a compile error here).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Minimal createRoot harness
// ---------------------------------------------------------------------------

function renderComponent(container: HTMLElement, props: SlotPickerProps): Root {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(SlotPicker, props))
  })
  return root
}

function rerender(root: Root, props: SlotPickerProps): void {
  act(() => {
    root.render(React.createElement(SlotPicker, props))
  })
}

const noop = () => {}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SlotPicker", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // 1. No-date state → EmptyState "Pick a date"
  // -------------------------------------------------------------------------
  it("renders EmptyState with 'Pick a date' when date prop is empty", () => {
    renderComponent(container, {
      date: "",
      availabilityData: null,
      availabilityLoading: false,
      selectedTime: null,
      onSelectTime: noop,
    })

    const text = container.textContent ?? ""

    // NEW behaviour: EmptyState with h2 "Pick a date" and body text
    expect(text).toContain("Pick a date")
    expect(text).toContain("Choose a day above to see available times.")

    // No accordion period buttons
    expect(container.querySelector("button[aria-expanded]")).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 2. Loading state → 3 accordion-row-shaped skeletons (9 skeleton primitives)
  // -------------------------------------------------------------------------
  it("renders 3 accordion-row-shaped skeletons during loading state", () => {
    renderComponent(container, {
      date: "2026-05-01",
      availabilityData: null,
      availabilityLoading: true,
      selectedTime: null,
      onSelectTime: noop,
    })

    // NEW behaviour: 3 rows × 3 [data-slot="skeleton"] each = 9 total
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(9)

    // Each outer row div must carry rounded-lg and border-input (or border) classes
    // to match the final accordion shape
    const outerRows = container.querySelectorAll("div.rounded-lg")
    expect(outerRows.length).toBeGreaterThanOrEqual(3)

    // Spot-check: at least one row has border-input or border class
    const hasBorderRow = Array.from(outerRows).some(
      (el) =>
        el.classList.contains("border-input") || el.classList.contains("border"),
    )
    expect(hasBorderRow).toBe(true)

    // No accordion toggle buttons
    expect(container.querySelector("button[aria-expanded]")).toBeNull()

    // No EmptyState titles
    expect(container.textContent).not.toContain("Pick a date")
    expect(container.textContent).not.toContain("No slots on this date")
  })

  // -------------------------------------------------------------------------
  // 3. Skeleton → accordion transition when availability resolves
  // -------------------------------------------------------------------------
  it("transitions from skeleton to accordion when availability resolves", () => {
    // Start: loading
    const root = renderComponent(container, {
      date: "2026-05-01",
      availabilityData: null,
      availabilityLoading: true,
      selectedTime: null,
      onSelectTime: noop,
    })

    // Assert skeletons present before resolve
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    // Re-render: resolved with morning slots
    rerender(root, {
      date: "2026-05-01",
      availabilityData: {
        busySlots: [],
        availableSlots: ["07:00", "07:30", "08:00"],
      },
      availabilityLoading: false,
      selectedTime: null,
      onSelectTime: noop,
    })

    // Zero skeleton elements after resolve
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)

    // At least one accordion period button (Morning has free slots)
    const accordionBtn = container.querySelector('button[aria-expanded="false"]')
    expect(accordionBtn).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // 4. Zero-availability → EmptyState "No slots on this date"
  // -------------------------------------------------------------------------
  it("renders EmptyState for zero-availability on a chosen date", () => {
    renderComponent(container, {
      date: "2026-05-01",
      availabilityData: { busySlots: [], availableSlots: [] },
      availabilityLoading: false,
      selectedTime: null,
      onSelectTime: noop,
    })

    const text = container.textContent ?? ""

    // NEW behaviour: EmptyState instead of 3 disabled accordion rows
    expect(text).toContain("No slots on this date")
    expect(text).toContain(
      "Try another day — most trainers add slots a few days ahead.",
    )

    // No accordion toggle buttons
    expect(container.querySelector("button[aria-expanded]")).toBeNull()

    // No skeleton elements
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(0)
  })

  // -------------------------------------------------------------------------
  // 5. motion-reduce variant present on available (non-busy) slot buttons
  // -------------------------------------------------------------------------
  it("motion-reduce variant present on available slot buttons", () => {
    vi.useFakeTimers()

    renderComponent(container, {
      date: "2026-05-01",
      availabilityData: {
        busySlots: ["07:00"],
        availableSlots: ["07:00", "07:30", "08:00"],
      },
      availabilityLoading: false,
      selectedTime: "07:30", // one selected slot
      onSelectTime: noop,
    })

    // Open the Morning accordion by clicking the period button
    const morningBtn = container.querySelector(
      "button[aria-expanded]",
    ) as HTMLButtonElement | null
    expect(morningBtn).not.toBeNull()

    act(() => {
      morningBtn!.click()
    })

    // Flush the 50ms scrollIntoView setTimeout
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Collect all slot buttons inside the open panel
    const panel = container.querySelector('[role="region"]')
    expect(panel).not.toBeNull()

    const allSlotBtns = Array.from(
      panel!.querySelectorAll("button"),
    ) as HTMLButtonElement[]

    expect(allSlotBtns.length).toBeGreaterThan(0)

    // Available (non-disabled) and selected buttons must carry both motion classes
    const enabledBtns = allSlotBtns.filter((btn) => !btn.disabled)
    expect(enabledBtns.length).toBeGreaterThan(0)

    for (const btn of enabledBtns) {
      expect(btn.className).toContain("active:scale-95")
      expect(btn.className).toContain("motion-reduce:active:scale-100")
    }

    // Busy (disabled) buttons must NOT carry the scale class
    const busyBtns = allSlotBtns.filter((btn) => btn.disabled)
    expect(busyBtns.length).toBeGreaterThan(0)

    for (const btn of busyBtns) {
      expect(btn.className).not.toContain("active:scale-95")
    }
  })
})
