import React from "react"
import { describe, it, expect } from "vitest"
import { Hero } from "../hero"

// Element-tree walker (same pattern as empty-state.test.tsx and icon.test.tsx).
// Default vitest node env — no DOM render needed for structural assertions.
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

describe("<Hero>", () => {
  it("renders the headline, subheadline, CTA label, and micro-copy", () => {
    const el = Hero()
    const headline = findAll(
      el,
      (n) =>
        n.type === "h1" &&
        typeof childOf(n) === "string" &&
        (childOf(n) as string).includes("Run your training business"),
    )
    expect(headline.length).toBe(1)

    const sub = findAll(
      el,
      (n) =>
        n.type === "p" &&
        typeof childOf(n) === "string" &&
        (childOf(n) as string).includes("FitDesk replaces your WhatsApp"),
    )
    expect(sub.length).toBe(1)

    const ctaText = findAll(
      el,
      (n) => childOf(n) === "Start free — 3 clients",
    )
    expect(ctaText.length).toBeGreaterThan(0)

    const micro = findAll(
      el,
      (n) =>
        typeof childOf(n) === "string" &&
        (childOf(n) as string).includes(
          "Free for your first 3 clients, forever",
        ),
    )
    expect(micro.length).toBe(1)
  })

  it("renders the primary CTA as a link to /signup", () => {
    const el = Hero()
    // next/link's default export identity — compare by identity, not string.
    // Safer: look for any element whose props include href="/signup".
    const signupLinks = findAll(el, (n) => {
      const props = n.props as { href?: unknown }
      return props?.href === "/signup"
    })
    expect(signupLinks.length).toBe(1)
  })

  it("applies Phase A typography tokens to the subheadline and micro-copy", () => {
    const el = Hero()

    const subHasToken = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        cls.includes("text-body-lg") && cls.includes("text-muted-foreground")
      )
    })
    expect(subHasToken.length).toBeGreaterThan(0)

    const microHasToken = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return cls.includes("text-micro") && cls.includes("text-muted-foreground")
    })
    expect(microHasToken.length).toBeGreaterThan(0)
  })

  it("applies motion-safe fade-in classes on the copy stack and mockup wrapper", () => {
    const el = Hero()
    const motionEls = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        cls.includes("motion-safe:animate-in") &&
        cls.includes("motion-safe:fade-in-0")
      )
    })
    // One wrapper for copy stack, one for phone-mockup.
    expect(motionEls.length).toBe(2)
  })
})
