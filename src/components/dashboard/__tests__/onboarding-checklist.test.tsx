// @vitest-environment happy-dom
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Mock heavy deps so the checklist test stays focused on its own contract
vi.mock("@/components/clients/AddClientWithPackageSheet", () => ({
  AddClientWithPackageSheet: ({ open }: { open: boolean }) => (
    <div data-testid="mock-sheet" data-open={String(open)} />
  ),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mutable state that the mocked useOnboarding closes over
type MockState = {
  steps: Record<string, boolean>
  onboardingCompleted: boolean
  bookingSlug: string | null
  isLoading: boolean
  completeStep: ReturnType<typeof vi.fn>
  dismissChecklist: ReturnType<typeof vi.fn>
}

let mockState: MockState = {
  steps: {},
  onboardingCompleted: false,
  bookingSlug: "avi-sg",
  isLoading: false,
  completeStep: vi.fn(),
  dismissChecklist: vi.fn(),
}

vi.mock("@/hooks/useOnboarding", () => ({
  useOnboarding: () => mockState,
}))

let mockClientCount = 0
vi.mock("@/hooks/useClients", () => ({
  useClients: () => ({ data: new Array(mockClientCount).fill({}) }),
}))

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => false,
}))

// Set a known origin so the share URL is predictable
Object.defineProperty(window, "location", {
  value: { origin: "https://fitdesk.pro" },
  writable: true,
})

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
})

import { OnboardingChecklist } from "../onboarding-checklist"

describe("<OnboardingChecklist>", () => {
  let container: HTMLElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    mockState = {
      steps: {},
      onboardingCompleted: false,
      bookingSlug: "avi-sg",
      isLoading: false,
      completeStep: vi.fn(),
      dismissChecklist: vi.fn(),
    }
    mockClientCount = 0
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  function render() {
    act(() => {
      root = createRoot(container)
      root.render(<OnboardingChecklist />)
    })
  }

  it("renders nothing when onboarding_completed is already true", () => {
    mockState.onboardingCompleted = true
    render()
    expect(container.textContent ?? "").not.toMatch(/get started/i)
    expect(container.textContent ?? "").not.toMatch(/ready to train/i)
  })

  it("renders nothing while loading", () => {
    mockState.isLoading = true
    render()
    expect(container.textContent ?? "").not.toMatch(/get started/i)
  })

  it("renders 3 step rows with 0/3 counter when nothing is complete", () => {
    render()
    expect(container.textContent ?? "").toMatch(/0\s*\/\s*3/)
    expect(container.textContent ?? "").toMatch(/add your first client/i)
    expect(container.textContent ?? "").toMatch(/set your availability/i)
    expect(container.textContent ?? "").toMatch(/share your booking link/i)
  })

  it("shows 2/3 when two steps are completed", () => {
    mockState.steps = { client_added: true, availability_set: true }
    render()
    expect(container.textContent ?? "").toMatch(/2\s*\/\s*3/)
  })

  it("clicking step 1 opens the add-client sheet", () => {
    render()
    const sheetBefore = container.querySelector(
      "[data-testid='mock-sheet']"
    ) as HTMLElement | null
    expect(sheetBefore?.getAttribute("data-open")).toBe("false")

    const row1 = Array.from(container.querySelectorAll("button")).find((b) =>
      /add your first client/i.test(b.textContent ?? "")
    )
    expect(row1).toBeDefined()

    act(() => {
      row1!.click()
    })

    const sheetAfter = container.querySelector(
      "[data-testid='mock-sheet']"
    ) as HTMLElement | null
    expect(sheetAfter?.getAttribute("data-open")).toBe("true")
  })

  it("step 2 is a link to /profile#availability and fires completeStep on click", () => {
    render()

    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      /set your availability/i.test(a.textContent ?? "")
    )
    expect(link).toBeDefined()
    expect(link!.getAttribute("href")).toBe("/profile#availability")

    act(() => {
      link!.click()
    })

    expect(mockState.completeStep).toHaveBeenCalledWith("availability_set")
  })

  it("step 3 reveals an inline share panel on click", () => {
    render()

    expect(container.textContent ?? "").not.toContain("fitdesk.pro/book/avi-sg")

    const row3 = Array.from(container.querySelectorAll("button")).find((b) =>
      /share your booking link/i.test(b.textContent ?? "")
    )
    expect(row3).toBeDefined()

    act(() => {
      row3!.click()
    })

    // After expanding, the booking URL should appear in the tree
    expect(container.textContent ?? "").toContain("fitdesk.pro/book/avi-sg")
  })

  it("shows the completion card when all three steps are done", () => {
    mockState.steps = {
      client_added: true,
      availability_set: true,
      link_shared: true,
    }
    render()
    expect(container.textContent ?? "").toMatch(/ready to train/i)
  })

  it("auto-dismisses the completion card after 3 seconds", () => {
    vi.useFakeTimers()
    mockState.steps = {
      client_added: true,
      availability_set: true,
      link_shared: true,
    }
    render()
    expect(mockState.dismissChecklist).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockState.dismissChecklist).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("does not fire dismissChecklist before 3 seconds elapse", () => {
    vi.useFakeTimers()
    mockState.steps = {
      client_added: true,
      availability_set: true,
      link_shared: true,
    }
    render()

    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(mockState.dismissChecklist).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
