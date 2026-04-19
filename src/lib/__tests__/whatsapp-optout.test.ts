import { describe, it, expect } from "vitest"
import { isOptOutError } from "../whatsapp-optout"

describe("isOptOutError", () => {
  it("detects Meta error code 131047", () => {
    expect(isOptOutError({ error: { code: 131047, message: "Re-engagement needed" } })).toBe(true)
  })

  it("detects numeric code nested at top-level error", () => {
    expect(isOptOutError({ error: { code: 131047 } })).toBe(true)
  })

  it("detects message containing 'opt out' (case-insensitive)", () => {
    expect(isOptOutError({ error: { code: 100, message: "Recipient has opted out" } })).toBe(true)
    expect(isOptOutError({ error: { code: 100, message: "OPT OUT received" } })).toBe(true)
    expect(isOptOutError({ error: { code: 100, message: "opt-out flag on account" } })).toBe(true)
  })

  it("returns false for unrelated errors", () => {
    expect(isOptOutError({ error: { code: 100, message: "Invalid parameter" } })).toBe(false)
    expect(isOptOutError({ error: { code: 190, message: "Token expired" } })).toBe(false)
  })

  it("returns false for malformed / empty payloads", () => {
    expect(isOptOutError(null)).toBe(false)
    expect(isOptOutError(undefined)).toBe(false)
    expect(isOptOutError({})).toBe(false)
    expect(isOptOutError({ error: null })).toBe(false)
    expect(isOptOutError("string")).toBe(false)
  })

  it("does not match substrings that aren't really opt-out", () => {
    expect(isOptOutError({ error: { code: 100, message: "topout" } })).toBe(false)
    expect(isOptOutError({ error: { code: 100, message: "no-stop-out issue" } })).toBe(false)
  })
})
