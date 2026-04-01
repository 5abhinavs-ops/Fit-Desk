import { describe, it, expect } from "vitest"
// formatWhatsapp.ts does not exist yet.
// This import will fail until the file and function are created — that is the RED state.
import { formatWhatsappNumber } from "../formatWhatsapp"

describe("formatWhatsappNumber", () => {
  describe("Singapore 8-digit numbers (no country code)", () => {
    it("normalises an 8-digit SG number starting with 9", () => {
      expect(formatWhatsappNumber("91234567")).toBe("+6591234567")
    })

    it("normalises an 8-digit SG number starting with 8", () => {
      expect(formatWhatsappNumber("81234567")).toBe("+6581234567")
    })
  })

  describe("Singapore numbers with country code and spaces", () => {
    it("strips spaces and normalises '65 9123 4567' (no plus)", () => {
      expect(formatWhatsappNumber("65 9123 4567")).toBe("+6591234567")
    })

    it("strips spaces and normalises '+65 9123 4567' (with plus)", () => {
      expect(formatWhatsappNumber("+65 9123 4567")).toBe("+6591234567")
    })
  })

  describe("Malaysia numbers", () => {
    it("normalises '+60 12 345 6789' to E.164", () => {
      expect(formatWhatsappNumber("+60 12 345 6789")).toBe("+60123456789")
    })

    it("normalises local MY number '0123456789' (strip 0, add +60)", () => {
      expect(formatWhatsappNumber("0123456789")).toBe("+60123456789")
    })

    it("normalises local MY number '01112345678' (11 digits)", () => {
      expect(formatWhatsappNumber("01112345678")).toBe("+601112345678")
    })

    it("normalises local MY number '0161234567' (016 prefix)", () => {
      expect(formatWhatsappNumber("0161234567")).toBe("+60161234567")
    })

    it("normalises local MY number '0191234567' (019 prefix)", () => {
      expect(formatWhatsappNumber("0191234567")).toBe("+60191234567")
    })
  })

  describe("Indonesia numbers", () => {
    it("normalises '+62 812 3456 7890' to E.164", () => {
      expect(formatWhatsappNumber("+62 812 3456 7890")).toBe("+6281234567890")
    })
  })

  describe("unrecognised input", () => {
    it("returns 'abc' unchanged", () => {
      expect(formatWhatsappNumber("abc")).toBe("abc")
    })
  })

  describe("already E.164 format", () => {
    it("does not add a second +65 prefix to '+6591234567'", () => {
      expect(formatWhatsappNumber("+6591234567")).toBe("+6591234567")
    })
  })
})
