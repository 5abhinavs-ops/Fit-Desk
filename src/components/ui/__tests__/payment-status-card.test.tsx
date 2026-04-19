// @vitest-environment happy-dom
// Uses happy-dom because PaymentStatusCard mounts DOM elements via createRoot
// and the test queries them directly. The default vitest environment is node,
// which has no DOM APIs.
//
// Render strategy: mirrors use-reduced-motion.test.ts — no @testing-library/react.
// A minimal createRoot harness renders the component and the DOM is queried directly
// via container.querySelector / container.textContent.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import type { PaymentStatusCardProps } from "../payment-status-card"
import { PaymentStatusCard } from "../payment-status-card"

// React 19 act() requires this flag in non-jsdom test environments.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ---------------------------------------------------------------------------
// Mock useReducedMotion so tests can control it without matchMedia setup.
// ---------------------------------------------------------------------------

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: vi.fn(() => false),
}))

// Import after mock so vi.mocked works correctly.
import { useReducedMotion } from "@/hooks/use-reduced-motion"

// ---------------------------------------------------------------------------
// Minimal createRoot harness
// ---------------------------------------------------------------------------

function renderCard(container: HTMLElement, props: PaymentStatusCardProps): Root {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(PaymentStatusCard, props))
  })
  return root
}

function rerender(root: Root, props: PaymentStatusCardProps): void {
  act(() => {
    root.render(React.createElement(PaymentStatusCard, props))
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaymentStatusCard", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    // Default: reduced motion is off.
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // 1. Pending — with due date
  // -------------------------------------------------------------------------
  it("renders pending panel with clock icon and due date subtitle", () => {
    renderCard(container, { status: "pending", dueDate: "2026-04-25" })

    const text = container.textContent ?? ""
    expect(text).toContain("Payment pending")
    // Formatted: "Due 25 Apr 2026"
    expect(text).toContain("25 Apr 2026")

    // Icon: Clock — lucide renders an <svg> with aria-label or data-lucide
    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // 2. Pending — null due date
  // -------------------------------------------------------------------------
  it("renders pending panel with 'No due date set' subtitle when dueDate is null", () => {
    renderCard(container, { status: "pending", dueDate: null })

    expect(container.textContent).toContain("No due date set")
  })

  // -------------------------------------------------------------------------
  // 3. Overdue — days-overdue title
  // -------------------------------------------------------------------------
  it("renders overdue panel with days-overdue title", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-20"))

    // dueDate is parsed as "YYYY-MM-DDT12:00:00" in local TZ (see component).
    // 2026-04-16T12:00 → 2026-04-20T00:00 = 3.5 days → floor 3.
    renderCard(container, { status: "overdue", dueDate: "2026-04-16" })

    const text = container.textContent ?? ""
    expect(text).toContain("3 days overdue")
    // Should also show the original due date
    expect(text).toContain("16 Apr 2026")

    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // 4. client_confirmed — with proof timestamp
  // -------------------------------------------------------------------------
  it("renders client_confirmed panel with proof upload timestamp", () => {
    renderCard(container, {
      status: "client_confirmed",
      proofUploadedAt: "2026-04-19T10:30:00Z",
    })

    const text = container.textContent ?? ""
    expect(text).toContain("Client confirmed payment")
    // Formatted: "Proof uploaded 19 Apr, 10:30 am" (or similar date-fns format)
    expect(text).toContain("19 Apr")
  })

  // -------------------------------------------------------------------------
  // 5. client_confirmed — null proofUploadedAt
  // -------------------------------------------------------------------------
  it("renders client_confirmed panel with 'Awaiting your review' when proofUploadedAt is null", () => {
    renderCard(container, {
      status: "client_confirmed",
      proofUploadedAt: null,
    })

    expect(container.textContent).toContain("Awaiting your review")
  })

  // -------------------------------------------------------------------------
  // 6. Received — with received date
  // -------------------------------------------------------------------------
  it("renders received panel with received date subtitle", () => {
    renderCard(container, {
      status: "received",
      receivedDate: "2026-04-20",
    })

    const text = container.textContent ?? ""
    expect(text).toContain("Payment received")
    expect(text).toContain("20 Apr 2026")
  })

  // -------------------------------------------------------------------------
  // 7. No ring on cold mount with client_confirmed
  // -------------------------------------------------------------------------
  it("no ring element on cold mount with status client_confirmed", () => {
    renderCard(container, { status: "client_confirmed" })

    const ring = container.querySelector('[data-testid="status-ring"]')
    expect(ring).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 8. Ring appears on pending → client_confirmed transition
  // -------------------------------------------------------------------------
  it("ring element appears on pending → client_confirmed transition", () => {
    const root = renderCard(container, { status: "pending" })

    // Confirm no ring before transition.
    expect(container.querySelector('[data-testid="status-ring"]')).toBeNull()

    rerender(root, { status: "client_confirmed" })

    const ring = container.querySelector('[data-testid="status-ring"]')
    expect(ring).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // 9. Ring does NOT mount when useReducedMotion returns true
  // -------------------------------------------------------------------------
  it("ring does not mount when useReducedMotion returns true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    const root = renderCard(container, { status: "pending" })
    rerender(root, { status: "client_confirmed" })

    expect(container.querySelector('[data-testid="status-ring"]')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 10. Ring does NOT mount when showMotion prop is false
  // -------------------------------------------------------------------------
  it("ring does not mount when showMotion prop is false", () => {
    // Hook returns false (motion enabled system-wide), but prop overrides.
    vi.mocked(useReducedMotion).mockReturnValue(false)

    const root = renderCard(container, { status: "pending", showMotion: false })
    rerender(root, { status: "client_confirmed", showMotion: false })

    expect(container.querySelector('[data-testid="status-ring"]')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 11. Final confirmed state visible after 600 ms — both reduced-motion variants
  // -------------------------------------------------------------------------
  it("shows 'Client confirmed payment' title after 600ms when motion is enabled", () => {
    vi.useFakeTimers()
    vi.mocked(useReducedMotion).mockReturnValue(false)

    renderCard(container, { status: "client_confirmed" })

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(container.textContent).toContain("Client confirmed payment")
  })

  it("shows 'Client confirmed payment' title after 600ms when reduced motion is true", () => {
    vi.useFakeTimers()
    vi.mocked(useReducedMotion).mockReturnValue(true)

    renderCard(container, { status: "client_confirmed" })

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(container.textContent).toContain("Client confirmed payment")
  })

  // -------------------------------------------------------------------------
  // 12. Custom className is merged onto root element
  // -------------------------------------------------------------------------
  it("custom className is merged onto root element", () => {
    renderCard(container, { status: "pending", className: "my-extra" })

    // The root element of PaymentStatusCard should carry the custom class.
    const root = container.firstElementChild as HTMLElement | null
    expect(root?.className).toContain("my-extra")
  })
})
