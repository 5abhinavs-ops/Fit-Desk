// @vitest-environment happy-dom
// Uses happy-dom because ShimmerOverlay mounts DOM elements via createRoot
// and the test queries them directly. The default vitest environment is node,
// which has no DOM APIs.
//
// Render strategy: mirrors payment-status-card.test.tsx — no @testing-library/react.
// A minimal createRoot harness renders the component and the DOM is queried directly
// via container.querySelector / container.innerHTML.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"

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
import { ShimmerOverlay } from "../shimmer-overlay"

// ---------------------------------------------------------------------------
// Minimal createRoot harness
// ---------------------------------------------------------------------------

interface ShimmerOverlayProps {
  className?: string
}

function renderOverlay(container: HTMLElement, props: ShimmerOverlayProps = {}): Root {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(ShimmerOverlay, props))
  })
  return root
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShimmerOverlay", () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    // Default: reduced motion is off (motion enabled).
    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // 1. Renders shimmer element when motion is allowed
  // -------------------------------------------------------------------------
  it("renders a shimmer element when motion is allowed", () => {
    renderOverlay(container)

    const shimmer = container.querySelector('[data-testid="shimmer-overlay"]')
    expect(shimmer).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // 2. Returns null when useReducedMotion returns true
  // -------------------------------------------------------------------------
  it("returns null when useReducedMotion returns true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    renderOverlay(container)

    const shimmer = container.querySelector('[data-testid="shimmer-overlay"]')
    expect(shimmer).toBeNull()
    expect(container.firstElementChild).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 3. Merges className onto the rendered element
  // -------------------------------------------------------------------------
  it("merges className onto the rendered element", () => {
    renderOverlay(container, { className: "absolute inset-0" })

    const shimmer = container.querySelector('[data-testid="shimmer-overlay"]') as HTMLElement | null
    expect(shimmer).not.toBeNull()
    expect(shimmer?.className).toContain("absolute")
    expect(shimmer?.className).toContain("inset-0")
  })

  // -------------------------------------------------------------------------
  // 4. className is not written to any element when reduced-motion returns true
  // -------------------------------------------------------------------------
  it("className is not written to any element when reduced-motion returns true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    renderOverlay(container, { className: "absolute inset-0" })

    expect(container.innerHTML).not.toContain("absolute")
    expect(container.innerHTML).not.toContain("inset-0")
  })
})
