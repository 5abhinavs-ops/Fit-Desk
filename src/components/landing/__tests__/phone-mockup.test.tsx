import React from "react"
import { describe, it, expect } from "vitest"
import { PhoneMockup } from "../phone-mockup"
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

describe("<PhoneMockup>", () => {
  it("renders a single outer device frame with aria-hidden", () => {
    const el = PhoneMockup()
    const frames = findAll(el, (n) => {
      const props = n.props as { "aria-hidden"?: unknown; className?: string }
      return (
        props["aria-hidden"] === true &&
        typeof props.className === "string" &&
        props.className.includes("rounded-[2.5rem]")
      )
    })
    expect(frames.length).toBe(1)
  })

  it("renders all icons through the Phase A <Icon> wrapper", () => {
    const el = PhoneMockup()
    const icons = findAll(el, (n) => n.type === Icon)
    // 2 content-card icons (Calendar + DollarSign) + 4 bottom-nav icons = 6.
    expect(icons.length).toBe(6)
    // No raw lucide <svg> components should leak through — every icon in the
    // tree must be rendered via <Icon>. (Lucide components themselves are
    // function references, not "svg" strings, so this also guards against
    // someone dropping a <Calendar />-style direct import.)
    const rawSvgs = findAll(el, (n) => n.type === "svg")
    expect(rawSvgs).toHaveLength(0)
  })

  it("applies Phase A typography tokens to visible copy", () => {
    const el = PhoneMockup()
    // Greeting should use text-body-lg; timestamp text-micro.
    const bodyLg = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return cls.includes("text-body-lg")
    })
    const micro = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return cls.includes("text-micro")
    })
    expect(bodyLg.length).toBeGreaterThan(0)
    expect(micro.length).toBeGreaterThan(0)
  })
})
