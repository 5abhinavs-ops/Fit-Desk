import { describe, it, expect } from "vitest"
import { buildWhatsappShareUrl } from "../whatsapp-share"

describe("buildWhatsappShareUrl", () => {
  it("produces a wa.me URL with encoded text", () => {
    const url = buildWhatsappShareUrl("https://fitdesk.pro/book/avi")
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(url).toContain(encodeURIComponent("https://fitdesk.pro/book/avi"))
  })

  it("encodes ampersands and spaces safely", () => {
    const url = buildWhatsappShareUrl(
      "https://fitdesk.pro/book/a+b&c",
      "Book a session with me"
    )
    expect(url).toContain(encodeURIComponent("Book a session with me"))
    expect(url).toContain(encodeURIComponent("https://fitdesk.pro/book/a+b&c"))
  })

  it("uses a default message if none supplied", () => {
    const url = buildWhatsappShareUrl("https://fitdesk.pro/book/avi")
    const decoded = decodeURIComponent(url.split("?text=")[1])
    expect(decoded).toContain("https://fitdesk.pro/book/avi")
    expect(decoded.length).toBeGreaterThan("https://fitdesk.pro/book/avi".length)
  })

  it("is https-only — never produces whatsapp:// scheme", () => {
    const url = buildWhatsappShareUrl("https://fitdesk.pro/book/avi")
    expect(url.startsWith("https://")).toBe(true)
    expect(url.startsWith("whatsapp://")).toBe(false)
  })
})
