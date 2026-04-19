// @vitest-environment happy-dom
import React from "react"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// React 19 act() requires this flag outside jsdom
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Mock the heavy sheet so the CTA test stays focused on the render contract
vi.mock("@/components/clients/AddClientWithPackageSheet", () => ({
  AddClientWithPackageSheet: ({
    open,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => <div data-testid="mock-sheet" data-open={String(open)} />,
}))

import { FirstClientCTA } from "../first-client-cta"

describe("<FirstClientCTA>", () => {
  let container: HTMLElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })

  it("renders a CTA button labelled 'Add your first client'", () => {
    act(() => {
      root = createRoot(container)
      root.render(<FirstClientCTA />)
    })

    const buttons = container.querySelectorAll("button")
    const addBtn = Array.from(buttons).find((b) =>
      /add your first client/i.test(b.textContent ?? "")
    )
    expect(addBtn).toBeDefined()
  })

  it("opens the sheet when the CTA button is clicked", () => {
    act(() => {
      root = createRoot(container)
      root.render(<FirstClientCTA />)
    })

    const sheetBefore = container.querySelector(
      "[data-testid='mock-sheet']"
    ) as HTMLElement | null
    expect(sheetBefore?.getAttribute("data-open")).toBe("false")

    const btn = Array.from(container.querySelectorAll("button")).find((b) =>
      /add your first client/i.test(b.textContent ?? "")
    )
    expect(btn).toBeDefined()

    act(() => {
      btn!.click()
    })

    const sheetAfter = container.querySelector(
      "[data-testid='mock-sheet']"
    ) as HTMLElement | null
    expect(sheetAfter?.getAttribute("data-open")).toBe("true")
  })

  it("renders the friendly title copy", () => {
    act(() => {
      root = createRoot(container)
      root.render(<FirstClientCTA />)
    })

    expect(container.textContent).toMatch(/your dashboard will come alive here/i)
  })
})
