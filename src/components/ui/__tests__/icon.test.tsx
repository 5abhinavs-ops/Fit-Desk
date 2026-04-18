// Wrapper contract is verified at the React-element level; DOM-serialization
// behavior of aria-hidden={undefined} is React's responsibility. Add jsdom only
// if real a11y issues surface.
import { describe, it, expect } from "vitest"
import type { ReactElement } from "react"
import { Home, Upload } from "lucide-react"
import { Icon } from "../icon"

interface IconRenderedProps {
  width: number
  height: number
  className?: string
  "aria-label"?: string
  "aria-hidden"?: boolean
}

function rendered(el: ReactElement): {
  type: ReactElement["type"]
  props: IconRenderedProps
} {
  return { type: el.type, props: el.props as unknown as IconRenderedProps }
}

describe("<Icon>", () => {
  describe("size prop", () => {
    it("renders width/height 16 for size='sm'", () => {
      const { props } = rendered(Icon({ name: Home, size: "sm" }))
      expect(props.width).toBe(16)
      expect(props.height).toBe(16)
    })

    it("renders width/height 20 for size='md'", () => {
      const { props } = rendered(Icon({ name: Home, size: "md" }))
      expect(props.width).toBe(20)
      expect(props.height).toBe(20)
    })

    it("renders width/height 24 for size='lg'", () => {
      const { props } = rendered(Icon({ name: Home, size: "lg" }))
      expect(props.width).toBe(24)
      expect(props.height).toBe(24)
    })

    it("defaults to size='md' (20px) when size is omitted", () => {
      const { props } = rendered(Icon({ name: Home }))
      expect(props.width).toBe(20)
      expect(props.height).toBe(20)
    })
  })

  describe("icon component (name prop)", () => {
    it("renders the lucide component passed as 'name'", () => {
      const { type } = rendered(Icon({ name: Home }))
      expect(type).toBe(Home)
    })

    it("renders a different lucide component when 'name' changes", () => {
      const { type } = rendered(Icon({ name: Upload }))
      expect(type).toBe(Upload)
    })
  })

  describe("className emission", () => {
    it("emits the size-class for md (size-5) when no className is provided", () => {
      const { props } = rendered(Icon({ name: Home }))
      expect(props.className).toBe("size-5")
    })

    it("emits the size-class for sm (size-4)", () => {
      const { props } = rendered(Icon({ name: Home, size: "sm" }))
      expect(props.className).toContain("size-4")
    })

    it("emits the size-class for lg (size-6)", () => {
      const { props } = rendered(Icon({ name: Home, size: "lg" }))
      expect(props.className).toContain("size-6")
    })

    it("merges caller className after the size-class", () => {
      const { props } = rendered(
        Icon({ name: Home, size: "sm", className: "text-fd-cyan" }),
      )
      expect(props.className).toContain("size-4")
      expect(props.className).toContain("text-fd-cyan")
    })
  })

  describe("arbitrary prop passthrough", () => {
    it("spreads arbitrary lucide props (style, strokeWidth) through to the underlying component", () => {
      const onClick = () => {}
      const style = { color: "red" }
      const el = Icon({
        name: Home,
        style,
        strokeWidth: 2.5,
        onClick,
      })
      // Cast via unknown to access non-IconRenderedProps keys without widening the helper.
      const props = el.props as unknown as Record<string, unknown>
      expect(props.style).toBe(style)
      expect(props.strokeWidth).toBe(2.5)
      expect(props.onClick).toBe(onClick)
    })

    it("does not allow rest props to override size-derived width/height", () => {
      // A caller that (incorrectly) passes width/height should still see the
      // wrapper's size prop win — because the explicit attrs are applied after
      // the spread.
      const el = Icon({
        name: Home,
        size: "lg",
        width: 999,
        height: 999,
      })
      const props = el.props as unknown as { width: number; height: number }
      expect(props.width).toBe(24)
      expect(props.height).toBe(24)
    })
  })

  describe("accessibility", () => {
    it("marks icon aria-hidden=true when no aria-label is provided", () => {
      const { props } = rendered(Icon({ name: Home }))
      expect(props["aria-hidden"]).toBe(true)
      expect(props["aria-label"]).toBeUndefined()
    })

    it("exposes aria-label and omits aria-hidden when an aria-label is provided", () => {
      const { props } = rendered(
        Icon({ name: Home, "aria-label": "Go to home" }),
      )
      expect(props["aria-label"]).toBe("Go to home")
      // Per WAI-ARIA best practice, aria-hidden is omitted (undefined) rather
      // than set to false when the element should be exposed to assistive tech.
      expect(props["aria-hidden"]).toBeUndefined()
    })
  })
})
