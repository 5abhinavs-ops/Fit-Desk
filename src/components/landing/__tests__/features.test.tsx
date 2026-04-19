import React from "react"
import { describe, it, expect } from "vitest"
import { Features } from "../features"
import { Icon } from "@/components/ui/icon"

function findAll(
  node: React.ReactNode,
  predicate: (el: React.ReactElement) => boolean,
): React.ReactElement[] {
  const out: React.ReactElement[] = []
  function walk(n: React.ReactNode): void {
    if (Array.isArray(n)) {
      for (const c of n) walk(c)
      return
    }
    if (n == null || typeof n !== "object") return
    const el = n as React.ReactElement
    if (predicate(el)) out.push(el)
    const children = (el.props as { children?: React.ReactNode })?.children
    if (children !== undefined) walk(children)
  }
  walk(node)
  return out
}

function childOf(el: React.ReactElement): React.ReactNode {
  return (el.props as { children?: React.ReactNode }).children
}

describe("<Features>", () => {
  it("renders exactly three feature cards", () => {
    const el = Features()
    const cards = findAll(el, (n) => n.type === "li")
    expect(cards.length).toBe(3)
  })

  it("renders a labelled section heading and supporting copy", () => {
    const el = Features()
    const heading = findAll(
      el,
      (n) =>
        n.type === "h2" &&
        (n.props as { id?: string }).id === "features-heading" &&
        typeof childOf(n) === "string" &&
        (childOf(n) as string).includes(
          "Built for the way you actually work",
        ),
    )
    expect(heading.length).toBe(1)

    const sectionHasAriaLabelledby = findAll(el, (n) => {
      const props = n.props as { "aria-labelledby"?: unknown }
      return (
        n.type === "section" && props["aria-labelledby"] === "features-heading"
      )
    })
    expect(sectionHasAriaLabelledby.length).toBe(1)
  })

  it("renders all three feature icons through the Phase A <Icon> wrapper", () => {
    const el = Features()
    const icons = findAll(el, (n) => n.type === Icon)
    expect(icons.length).toBe(3)

    const rawSvgs = findAll(el, (n) => n.type === "svg")
    expect(rawSvgs).toHaveLength(0)
  })

  it("applies Phase A typography tokens to body and feature titles", () => {
    const el = Features()

    const subHasToken = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        cls.includes("text-body-lg") && cls.includes("text-muted-foreground")
      )
    })
    expect(subHasToken.length).toBeGreaterThan(0)

    const titles = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return n.type === "h3" && cls.includes("text-display-sm")
    })
    expect(titles.length).toBe(3)

    const bodySm = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return cls.includes("text-body-sm") && cls.includes("text-muted-foreground")
    })
    expect(bodySm.length).toBe(3)
  })

  it("applies motion-safe fade-in classes on each feature card", () => {
    const el = Features()
    const motionEls = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        n.type === "li" &&
        cls.includes("motion-safe:animate-in") &&
        cls.includes("motion-safe:fade-in-0")
      )
    })
    expect(motionEls.length).toBe(3)
  })
})
