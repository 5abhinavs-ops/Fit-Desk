import React from "react"
import { describe, it, expect } from "vitest"
import { Footer } from "../footer"

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

describe("<Footer>", () => {
  it("renders inside a <footer> element with a top border", () => {
    const el = Footer()
    const footers = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return n.type === "footer" && cls.includes("border-t")
    })
    expect(footers.length).toBe(1)
  })

  it("includes the current year in the copyright line", () => {
    const el = Footer()
    const year = new Date().getFullYear()
    const lines = findAll(el, (n) => {
      const c = (n.props as { children?: React.ReactNode })?.children
      if (!Array.isArray(c)) return false
      const joined = c
        .map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : ""))
        .join("")
      return (
        n.type === "p" &&
        joined.includes(String(year)) &&
        joined.includes("FitDesk")
      )
    })
    expect(lines.length).toBe(1)
  })

  it("applies the Phase A micro typography token to the copyright line", () => {
    const el = Footer()
    const microP = findAll(el, (n) => {
      const cls = (n.props as { className?: string })?.className ?? ""
      return (
        n.type === "p" &&
        cls.includes("text-micro") &&
        cls.includes("text-muted-foreground")
      )
    })
    expect(microP.length).toBe(1)
  })
})
