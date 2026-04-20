import { describe, it, expect } from "vitest"
import { isValidE164Phone } from "../phone-validate"

describe("isValidE164Phone", () => {
  it("accepts valid Singapore mobile", () => {
    expect(isValidE164Phone("+6591234567")).toBe(true)
  })

  it("rejects missing plus prefix", () => {
    expect(isValidE164Phone("6591234567")).toBe(false)
  })

  it("rejects non-digits after plus", () => {
    expect(isValidE164Phone("+65abcd")).toBe(false)
  })

  it("rejects too short", () => {
    expect(isValidE164Phone("+1234567")).toBe(false)
  })

  it("rejects too long", () => {
    expect(isValidE164Phone("+1234567890123456")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isValidE164Phone("")).toBe(false)
  })

  it("rejects whitespace-only", () => {
    expect(isValidE164Phone("   ")).toBe(false)
  })
})
