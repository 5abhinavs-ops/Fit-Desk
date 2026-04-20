import { describe, it, expect } from "vitest"
import {
  PACKAGE_PRESETS,
  buildPackagePayload,
  formatPresetLabel,
} from "../package-presets"

describe("PACKAGE_PRESETS", () => {
  it("has at least two ready-to-ship preset sizes", () => {
    expect(PACKAGE_PRESETS.length).toBeGreaterThanOrEqual(2)
  })

  it("every preset has positive sessions and positive price", () => {
    for (const p of PACKAGE_PRESETS) {
      expect(p.sessions).toBeGreaterThan(0)
      expect(p.price).toBeGreaterThan(0)
      expect(p.label.length).toBeGreaterThan(0)
    }
  })

  it("default preset is the 10-session $800 pack (widest SEA coverage)", () => {
    expect(PACKAGE_PRESETS[0]).toMatchObject({ sessions: 10, price: 800 })
  })
})

describe("formatPresetLabel", () => {
  it("renders sessions + price in one line", () => {
    expect(formatPresetLabel({ label: "Starter", sessions: 10, price: 800 })).toBe(
      "10 sessions · $800",
    )
  })
})

describe("buildPackagePayload", () => {
  it("uses the client's first name in the package name", () => {
    const payload = buildPackagePayload({
      clientId: "c1",
      firstName: "Priya",
      sessions: 10,
      price: 800,
    })
    expect(payload.name).toBe("Priya — 10-session pack")
    expect(payload.client_id).toBe("c1")
    expect(payload.total_sessions).toBe(10)
    expect(payload.price).toBe(800)
  })

  it("defaults start_date to today (YYYY-MM-DD)", () => {
    const payload = buildPackagePayload({
      clientId: "c1",
      firstName: "P",
      sessions: 10,
      price: 800,
    })
    expect(payload.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("leaves expiry_date null", () => {
    const payload = buildPackagePayload({
      clientId: "c1",
      firstName: "P",
      sessions: 10,
      price: 800,
    })
    expect(payload.expiry_date).toBeNull()
  })

  it("rejects non-positive sessions", () => {
    expect(() =>
      buildPackagePayload({
        clientId: "c1",
        firstName: "P",
        sessions: 0,
        price: 800,
      }),
    ).toThrow()
  })

  it("rejects negative price", () => {
    expect(() =>
      buildPackagePayload({
        clientId: "c1",
        firstName: "P",
        sessions: 10,
        price: -1,
      }),
    ).toThrow()
  })
})
