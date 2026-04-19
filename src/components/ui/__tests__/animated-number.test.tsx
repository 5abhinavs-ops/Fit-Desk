// @vitest-environment happy-dom
// Uses happy-dom because AnimatedNumber mounts DOM elements via createRoot and
// the rAF-based tween runs against the DOM. The default vitest environment is
// node, which has no DOM APIs.
//
// Render strategy: mirrors payment-status-card.test.tsx — no @testing-library/react.
// A minimal createRoot harness renders the component and the DOM is queried directly
// via container.textContent / container.firstElementChild.

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

// Import the component and its props from the module under test so the tests
// stay locked to the real exported interface (catches drift on prop changes).
import { AnimatedNumber, type AnimatedNumberProps } from "../animated-number"

// ---------------------------------------------------------------------------
// Minimal createRoot harness
// ---------------------------------------------------------------------------

function renderComponent(
  container: HTMLElement,
  props: AnimatedNumberProps,
): Root {
  const root = createRoot(container)
  act(() => {
    root.render(React.createElement(AnimatedNumber, props))
  })
  return root
}

function rerender(root: Root, props: AnimatedNumberProps): void {
  act(() => {
    root.render(React.createElement(AnimatedNumber, props))
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnimatedNumber", () => {
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
  // 1. Renders value immediately on mount when no from prop is given
  // -------------------------------------------------------------------------
  it("renders the value immediately on mount when no from prop is given", () => {
    renderComponent(container, { value: 10 })

    expect(container.textContent).toBe("10")
  })

  // -------------------------------------------------------------------------
  // 2. Renders the from value on first paint when from !== value
  // -------------------------------------------------------------------------
  it("renders the from value on first paint when from !== value", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    renderComponent(container, { value: 10, from: 0 })

    // Before any timers advance, the component should show the starting value.
    expect(container.textContent).toBe("0")
  })

  // -------------------------------------------------------------------------
  // 3. Animates from → value over the duration (mid-point check)
  // -------------------------------------------------------------------------
  it("animates from → value over the duration", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    renderComponent(container, { value: 10, from: 0, duration: 400 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    const current = Number(container.textContent)
    expect(current).toBeGreaterThan(0)
    expect(current).toBeLessThan(10)
  })

  // -------------------------------------------------------------------------
  // 4. Final rendered value matches the prop within duration + 100ms tolerance
  // -------------------------------------------------------------------------
  it("final rendered value matches the prop within duration + 100ms tolerance", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    renderComponent(container, { value: 10, from: 0, duration: 400 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(container.textContent).toBe("10")
  })

  // -------------------------------------------------------------------------
  // 5. Tweens when value prop changes after mount
  // -------------------------------------------------------------------------
  it("tweens when value prop changes after mount", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    const root = renderComponent(container, { value: 10, duration: 400 })

    // Rerender with a new value — should start tweening from 10 → 20.
    rerender(root, { value: 20, duration: 400 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    const current = Number(container.textContent)
    expect(current).toBeGreaterThan(10)
    expect(current).toBeLessThan(20)
  })

  // -------------------------------------------------------------------------
  // 6. Reduced-motion renders value directly and ignores from
  // -------------------------------------------------------------------------
  it("reduced-motion renders value directly and ignores from", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)

    renderComponent(container, { value: 10, from: 0 })

    // Should immediately show the target value, not the from value.
    expect(container.textContent).toBe("10")
  })

  // -------------------------------------------------------------------------
  // 7. Reduced-motion renders new value immediately on prop change
  // -------------------------------------------------------------------------
  it("reduced-motion renders new value immediately on prop change", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })
    vi.mocked(useReducedMotion).mockReturnValue(true)

    const root = renderComponent(container, { value: 10 })

    // Rerender with new value — should flip immediately without timer advance.
    rerender(root, { value: 20 })

    expect(container.textContent).toBe("20")
  })

  // -------------------------------------------------------------------------
  // 8. className prop is applied to the rendered element
  // -------------------------------------------------------------------------
  it("className prop is applied to the rendered element", () => {
    renderComponent(container, { value: 5, className: "my-class" })

    const el = container.firstElementChild as HTMLElement | null
    expect(el?.className).toContain("my-class")
  })

  // -------------------------------------------------------------------------
  // 9. Intermediate values are integers, not floats
  // -------------------------------------------------------------------------
  it("intermediate values are integers, not floats", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    renderComponent(container, { value: 10, from: 0, duration: 400 })

    act(() => {
      vi.advanceTimersByTime(150)
    })

    const displayed = Number(container.textContent)
    expect(Number.isInteger(displayed)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // 10. Unmounting during animation does not throw
  // -------------------------------------------------------------------------
  it("unmounting during animation does not throw", () => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "setInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    })

    const root = renderComponent(container, { value: 10, from: 0, duration: 400 })

    // Advance partway through the animation.
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Unmount mid-animation — must not throw.
    expect(() => {
      act(() => {
        root.unmount()
      })
    }).not.toThrow()

    // Advance timers further after unmount — must not throw.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(400)
      })
    }).not.toThrow()
  })
})
