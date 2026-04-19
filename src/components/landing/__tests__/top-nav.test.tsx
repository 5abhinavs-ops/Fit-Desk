import React from "react"
import { describe, it, expect } from "vitest"
import { TopNav } from "../top-nav"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"

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

describe("<TopNav>", () => {
  it("renders the FitDeskLogo wrapped in a link to /welcome", () => {
    const el = TopNav()
    const homeLink = findAll(el, (n) => {
      const props = n.props as { href?: unknown; "aria-label"?: unknown }
      return props.href === "/welcome" && props["aria-label"] === "FitDesk home"
    })
    expect(homeLink.length).toBe(1)

    const logos = findAll(el, (n) => n.type === FitDeskLogo)
    expect(logos.length).toBe(1)
  })

  it("renders a Sign in link pointing to /login", () => {
    const el = TopNav()
    const signInLink = findAll(el, (n) => {
      const props = n.props as { href?: unknown }
      return props.href === "/login" && childOf(n) === "Sign in"
    })
    expect(signInLink.length).toBe(1)
  })
})
