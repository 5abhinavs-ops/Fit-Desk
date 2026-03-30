import { describe, it, expect } from "vitest"
// buildSlots is not yet exported from BookingForm.tsx.
// This import will fail until the function is exported — that is the RED state.
import { buildSlots } from "../BookingForm"

describe("buildSlots", () => {
  describe("morning window: buildSlots(6, 11)", () => {
    it("returns exactly 11 slots", () => {
      const slots = buildSlots(6, 11)
      expect(slots).toHaveLength(11)
    })

    it("first slot is 06:00", () => {
      const slots = buildSlots(6, 11)
      expect(slots[0]).toBe("06:00")
    })

    it("last slot is 11:00", () => {
      const slots = buildSlots(6, 11)
      expect(slots[slots.length - 1]).toBe("11:00")
    })

    it("does not include 11:30", () => {
      const slots = buildSlots(6, 11)
      expect(slots).not.toContain("11:30")
    })

    it("contains no duplicate slots", () => {
      const slots = buildSlots(6, 11)
      const unique = [...new Set(slots)]
      expect(unique).toHaveLength(slots.length)
    })
  })

  describe("afternoon window: buildSlots(12, 17)", () => {
    it("returns exactly 11 slots", () => {
      const slots = buildSlots(12, 17)
      expect(slots).toHaveLength(11)
    })

    it("first slot is 12:00", () => {
      const slots = buildSlots(12, 17)
      expect(slots[0]).toBe("12:00")
    })

    it("last slot is 17:00", () => {
      const slots = buildSlots(12, 17)
      expect(slots[slots.length - 1]).toBe("17:00")
    })

    it("does not include 17:30", () => {
      const slots = buildSlots(12, 17)
      expect(slots).not.toContain("17:30")
    })

    it("contains no duplicate slots", () => {
      const slots = buildSlots(12, 17)
      const unique = [...new Set(slots)]
      expect(unique).toHaveLength(slots.length)
    })
  })

  describe("evening window: buildSlots(18, 21)", () => {
    it("returns exactly 7 slots", () => {
      const slots = buildSlots(18, 21)
      expect(slots).toHaveLength(7)
    })

    it("first slot is 18:00", () => {
      const slots = buildSlots(18, 21)
      expect(slots[0]).toBe("18:00")
    })

    it("last slot is 21:00", () => {
      const slots = buildSlots(18, 21)
      expect(slots[slots.length - 1]).toBe("21:00")
    })

    it("does not include 21:30", () => {
      const slots = buildSlots(18, 21)
      expect(slots).not.toContain("21:30")
    })

    it("contains no duplicate slots", () => {
      const slots = buildSlots(18, 21)
      const unique = [...new Set(slots)]
      expect(unique).toHaveLength(slots.length)
    })
  })
})
