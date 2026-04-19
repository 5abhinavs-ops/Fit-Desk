import React from "react"
import { describe, it, expect, vi } from "vitest"
import Link from "next/link"
import { CalendarPlus, Receipt, Ruler } from "lucide-react"
import { EmptyState } from "../empty-state"
import { Icon } from "../icon"
import { Button } from "../button"

// ---------------------------------------------------------------------------
// Tree walker — mirrors the pattern in icon.test.tsx but generalised for
// recursive descent through an arbitrary React element tree.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Convenience predicate helpers
// ---------------------------------------------------------------------------
const isButton = (el: React.ReactElement) => el.type === Button
const isIcon = (el: React.ReactElement) => el.type === Icon
const isLink = (el: React.ReactElement) => el.type === Link
const isAnchor = (el: React.ReactElement) => el.type === "a"

// React 19 types `ReactElement.props` as `unknown` / `{}`; cast through this
// helper so predicates can read `children` without a per-call assertion.
function childOf(el: React.ReactElement): React.ReactNode {
  return (el.props as { children?: React.ReactNode }).children
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("<EmptyState>", () => {
  // 1 -----------------------------------------------------------------------
  it("renders with icon and title only (no body, no action)", () => {
    const el = EmptyState({ icon: CalendarPlus, title: "No sessions yet" })

    // Root element must be a div
    expect(el.type).toBe("div")

    // Title must appear somewhere in the tree
    const texts = findAll(el, (n) => childOf(n) === "No sessions yet")
    expect(texts.length).toBeGreaterThan(0)

    // No action elements
    expect(findAll(el, isButton)).toHaveLength(0)
    expect(findAll(el, isLink)).toHaveLength(0)
    expect(findAll(el, isAnchor)).toHaveLength(0)
  })

  // 2 -----------------------------------------------------------------------
  it("renders body paragraph with Phase A body-sm muted tokens when body is provided", () => {
    const el = EmptyState({
      icon: Receipt,
      title: "No payments",
      body: "Add a payment to get started",
    })

    const bodyNodes = findAll(el, (n) => {
      const cls: string = (n.props as { className?: string })?.className ?? ""
      return (
        childOf(n) === "Add a payment to get started" &&
        cls.includes("text-body-sm") &&
        cls.includes("text-muted-foreground")
      )
    })

    expect(bodyNodes.length).toBeGreaterThan(0)
  })

  // 3 -----------------------------------------------------------------------
  it("omits body paragraph entirely when body is not provided", () => {
    const el = EmptyState({ icon: Ruler, title: "No measurements" })

    // No node anywhere in the tree should carry text-body-sm
    const bodyLike = findAll(el, (n) => {
      const cls: string = (n.props as { className?: string })?.className ?? ""
      return cls.includes("text-body-sm")
    })

    expect(bodyLike).toHaveLength(0)
  })

  // 4 -----------------------------------------------------------------------
  it("internal link action renders next/link with no target or rel attributes", () => {
    const el = EmptyState({
      icon: CalendarPlus,
      title: "No sessions",
      action: { label: "Add session", href: "/bookings/new" },
    })

    const links = findAll(el, isLink)
    expect(links.length).toBeGreaterThan(0)

    const link = links[0]
    const props = link.props as Record<string, unknown>

    expect(props.href).toBe("/bookings/new")
    expect(props.target).toBeUndefined()
    expect(props.rel).toBeUndefined()

    // Button with correct label must be inside the Link
    const buttons = findAll(link, isButton)
    expect(buttons.length).toBeGreaterThan(0)
    const buttonText = findAll(buttons[0], (n) => childOf(n) === "Add session")
    expect(buttonText.length).toBeGreaterThan(0)
  })

  // 5 -----------------------------------------------------------------------
  it("external link action renders plain anchor with target _blank and rel noopener noreferrer", () => {
    const el = EmptyState({
      icon: Receipt,
      title: "Learn more",
      action: {
        label: "Open guide",
        href: "https://example.com/guide",
        external: true,
      },
    })

    const anchors = findAll(el, isAnchor)
    expect(anchors.length).toBeGreaterThan(0)

    const anchor = anchors[0]
    const props = anchor.props as Record<string, unknown>

    expect(props.href).toBe("https://example.com/guide")
    expect(props.target).toBe("_blank")
    expect(props.rel).toBe("noopener noreferrer")

    // Button with correct label must be inside the anchor
    const buttons = findAll(anchor, isButton)
    expect(buttons.length).toBeGreaterThan(0)
    const buttonText = findAll(buttons[0], (n) => childOf(n) === "Open guide")
    expect(buttonText.length).toBeGreaterThan(0)

    // Must NOT be rendered as a next/link
    expect(findAll(el, isLink)).toHaveLength(0)
  })

  // 6 -----------------------------------------------------------------------
  it("handler action renders Button with the same onClick identity", () => {
    const handler = vi.fn()
    const el = EmptyState({
      icon: Ruler,
      title: "No data",
      action: { label: "Do something", onClick: handler },
    })

    const buttons = findAll(el, isButton)
    expect(buttons.length).toBeGreaterThan(0)

    const btn = buttons[0]
    const props = btn.props as Record<string, unknown>
    // Strict identity — same function reference
    expect(props.onClick).toBe(handler)

    // No Link or anchor wrapping it
    expect(findAll(el, isLink)).toHaveLength(0)
    expect(findAll(el, isAnchor)).toHaveLength(0)
  })

  // 7 -----------------------------------------------------------------------
  it("no action prop results in no button and no anchor in the tree", () => {
    const el = EmptyState({ icon: CalendarPlus, title: "Nothing here" })

    expect(findAll(el, isButton)).toHaveLength(0)
    expect(findAll(el, isLink)).toHaveLength(0)
    expect(findAll(el, isAnchor)).toHaveLength(0)
  })

  // 8 -----------------------------------------------------------------------
  it("title uses Phase A text-display-sm class with a font-semibold weight", () => {
    const el = EmptyState({ icon: Receipt, title: "My heading" })

    const titleNodes = findAll(el, (n) => {
      const cls: string = (n.props as { className?: string })?.className ?? ""
      return (
        cls.includes("text-display-sm") &&
        cls.includes("font-semibold")
      )
    })

    expect(titleNodes.length).toBeGreaterThan(0)

    // The matching node must contain the title text
    const hasText = titleNodes.some((n) => childOf(n) === "My heading")
    expect(hasText).toBe(true)
  })

  // 9 -----------------------------------------------------------------------
  it("icon renders through the Icon wrapper at size lg with a muted class", () => {
    const el = EmptyState({ icon: Ruler, title: "Empty" })

    const icons = findAll(el, isIcon)
    expect(icons.length).toBeGreaterThan(0)

    const iconEl = icons[0]
    const props = iconEl.props as Record<string, unknown>

    // name prop must be the lucide icon passed in
    expect(props.name).toBe(Ruler)
    // size must be "lg"
    expect(props.size).toBe("lg")
    // className must include a muted colour token
    const cls = (props.className as string | undefined) ?? ""
    expect(cls).toContain("text-muted-foreground")
  })

  // 10 ----------------------------------------------------------------------
  it("custom className prop is merged onto the root element", () => {
    const el = EmptyState({
      icon: CalendarPlus,
      title: "Empty",
      className: "mt-8 custom-class",
    })

    expect(el.type).toBe("div")
    const rootClass: string =
      (el.props as { className?: string })?.className ?? ""

    // Custom class must be present
    expect(rootClass).toContain("custom-class")

    // Centered column layout tokens must also be present
    expect(rootClass).toContain("flex")
    expect(rootClass).toContain("flex-col")
    expect(rootClass).toContain("items-center")
    expect(rootClass).toContain("justify-center")
    expect(rootClass).toContain("text-center")
  })

  // 11 ----------------------------------------------------------------------
  // headingLevel prop — default h2, overridable to h3 for nested contexts.
  it("renders title as h2 by default and h3 when headingLevel='h3'", () => {
    const defaultEl = EmptyState({ icon: CalendarPlus, title: "Default" })
    const h2Nodes = findAll(defaultEl, (n) => n.type === "h2")
    expect(h2Nodes.length).toBeGreaterThan(0)
    expect(findAll(defaultEl, (n) => n.type === "h3")).toHaveLength(0)

    const h3El = EmptyState({
      icon: CalendarPlus,
      title: "Nested",
      headingLevel: "h3",
    })
    const h3Nodes = findAll(h3El, (n) => n.type === "h3")
    expect(h3Nodes.length).toBeGreaterThan(0)
    expect(findAll(h3El, (n) => n.type === "h2")).toHaveLength(0)
  })
})
