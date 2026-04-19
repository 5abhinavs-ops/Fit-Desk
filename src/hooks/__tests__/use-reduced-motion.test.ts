// @vitest-environment happy-dom
// Uses happy-dom because useReducedMotion requires matchMedia and DOM APIs unavailable
// in the default node environment.
//
// Render strategy: Option B — @testing-library/react is not installed.
// A minimal createRoot harness renders the hook inside a function component and
// captures the returned value via a callback ref.

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest"
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { useReducedMotion, _internals } from "../use-reduced-motion"

// React 19 act() requires this flag in non-jsdom environments.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// ---------------------------------------------------------------------------
// matchMedia mock factory
// ---------------------------------------------------------------------------

function mockMatchMedia(initial: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches: initial,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((_: string, h: (e: MediaQueryListEvent) => void) => {
      listeners.add(h)
    }),
    removeEventListener: vi.fn((_: string, h: (e: MediaQueryListEvent) => void) => {
      listeners.delete(h)
    }),
    dispatchEvent: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }
  window.matchMedia = vi.fn(() => mql as unknown as MediaQueryList)
  return {
    mql,
    fire(value: boolean) {
      mql.matches = value
      listeners.forEach((l) =>
        l({ matches: value, media: mql.media } as MediaQueryListEvent)
      )
    },
  }
}

// ---------------------------------------------------------------------------
// Minimal createRoot harness
// ---------------------------------------------------------------------------

type ValueRef = { current: boolean | null }

function renderHookInDOM(
  container: HTMLElement,
  valueRef: ValueRef
): Root {
  function Harness({ onValue }: { onValue: (v: boolean) => void }) {
    const result = useReducedMotion()
    onValue(result)
    return null
  }

  const root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(Harness, {
        onValue: (v: boolean) => {
          valueRef.current = v
        },
      })
    )
  })
  return root
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useReducedMotion", () => {
  let container: HTMLElement
  let mock: ReturnType<typeof mockMatchMedia>

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it("returns false when prefers-reduced-motion is not active", () => {
    mock = mockMatchMedia(false)
    const valueRef: ValueRef = { current: null }

    renderHookInDOM(container, valueRef)

    expect(valueRef.current).toBe(false)
  })

  it("returns true when prefers-reduced-motion is active", () => {
    mock = mockMatchMedia(true)
    const valueRef: ValueRef = { current: null }

    renderHookInDOM(container, valueRef)

    expect(valueRef.current).toBe(true)
  })

  it("updates when media query state changes", () => {
    mock = mockMatchMedia(false)
    const valueRef: ValueRef = { current: null }

    renderHookInDOM(container, valueRef)
    expect(valueRef.current).toBe(false)

    act(() => {
      mock.fire(true)
    })

    expect(valueRef.current).toBe(true)
  })

  it("removes event listener on unmount", () => {
    mock = mockMatchMedia(false)
    const valueRef: ValueRef = { current: null }

    const root = renderHookInDOM(container, valueRef)

    // Capture the handler reference that was registered
    const addCall = mock.mql.addEventListener.mock.calls[0]
    expect(addCall).toBeDefined()
    const registeredHandler = addCall[1]

    // Unmount the component tree — use the same root the harness mounted on
    act(() => {
      root.unmount()
    })

    expect(mock.mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      registeredHandler
    )
  })

  describe("SSR path — window is undefined", () => {
    let originalWindow: typeof globalThis.window

    beforeAll(() => {
      originalWindow = globalThis.window
      // @ts-expect-error — intentionally deleting window to simulate SSR
      delete globalThis.window
    })

    afterAll(() => {
      globalThis.window = originalWindow
    })

    // The hook itself can't be called outside a component render (it uses
    // useSyncExternalStore). We verify the SSR path via the internal helpers:
    // getServerSnapshot always returns false (React uses this during SSR),
    // and getSnapshot returns false when window is undefined.
    it("getServerSnapshot returns false (used by React during SSR)", () => {
      expect(_internals.getServerSnapshot()).toBe(false)
    })

    it("getSnapshot returns false when window is undefined", () => {
      expect(_internals.getSnapshot()).toBe(false)
    })

    it("subscribe is a no-op when window is undefined", () => {
      const callback = vi.fn()
      const unsubscribe = _internals.subscribe(callback)
      expect(typeof unsubscribe).toBe("function")
      // Should not throw, and cleanup should be safe.
      expect(() => unsubscribe()).not.toThrow()
      expect(callback).not.toHaveBeenCalled()
    })
  })
})
