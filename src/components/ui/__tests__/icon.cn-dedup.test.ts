// Guard test: the Icon wrapper's escape-hatch pattern depends on
// tailwind-merge deduplicating `size-*` classes. If cn() ever stops calling
// tailwind-merge (e.g. a future refactor), this test catches it immediately.
import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn() tailwind-merge dedup for Icon escape-hatch", () => {
  it("dedupes size-* conflicts, keeping the last class", () => {
    expect(cn("size-6", "size-10")).toBe("size-10")
    expect(cn("size-6", "size-7")).toBe("size-7")
    expect(cn("size-4", "size-3")).toBe("size-3")
    expect(cn("size-4", "size-3.5")).toBe("size-3.5")
  })

  it("preserves non-conflicting classes", () => {
    expect(cn("size-5", "text-fd-cyan")).toBe("size-5 text-fd-cyan")
    expect(cn("size-4", "mr-2 animate-spin")).toContain("size-4")
    expect(cn("size-4", "mr-2 animate-spin")).toContain("mr-2")
    expect(cn("size-4", "mr-2 animate-spin")).toContain("animate-spin")
  })
})
