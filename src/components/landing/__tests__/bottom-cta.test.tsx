import React from "react"
import { describe, it, expect } from "vitest"
import { BottomCta } from "../bottom-cta"

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

describe("<BottomCta>", () => {
  it("renders the headline that anchors the free-tier promise", () => {
    const el = BottomCta()
    const heading = findAll(
      el,
      (n) =>
        n.type === "h2" &&
        typeof childOf(n) === "string" &&
        (childOf(n) as string).includes("Free for your first 3 clients"),
    )
    expect(heading.length).toBe(1)
  })

  it("links the primary CTA to /signup with the Start free label", () => {
    const el = BottomCta()
    const signupLinks = findAll(el, (n) => {
      const props = n.props as { href?: unknown }
      return props?.href === "/signup"
    })
    expect(signupLinks.length).toBe(1)

    const ctaLabel = findAll(
      el,
      (n) => childOf(n) === "Start free — 3 clients",
    )
    expect(ctaLabel.length).toBeGreaterThan(0)
  })

  it("uses aria-labelledby to associate the section with its heading", () => {
    const el = BottomCta()
    const section = findAll(el, (n) => {
      const props = n.props as { "aria-labelledby"?: unknown }
      return (
        n.type === "section" &&
        props["aria-labelledby"] === "bottom-cta-heading"
      )
    })
    expect(section.length).toBe(1)

    const heading = findAll(el, (n) => {
      const props = n.props as { id?: unknown }
      return n.type === "h2" && props.id === "bottom-cta-heading"
    })
    expect(heading.length).toBe(1)
  })

  it("applies the Phase A body-lg muted token to the supporting copy", () => {
    const el = BottomCta()
    const supporting = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        n.type === "p" &&
        cls.includes("text-body-lg") &&
        cls.includes("text-muted-foreground")
      )
    })
    expect(supporting.length).toBe(1)
  })
})
