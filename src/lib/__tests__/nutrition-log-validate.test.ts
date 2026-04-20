import { describe, it, expect } from "vitest"
import { nutritionLogSchema } from "../nutrition-log-validate"

describe("nutritionLogSchema", () => {
  const base = {
    meal_name: "Chicken rice",
    meal_type: "lunch" as const,
  }

  it("accepts minimum valid payload", () => {
    const result = nutritionLogSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it("rejects empty meal_name", () => {
    const result = nutritionLogSchema.safeParse({ ...base, meal_name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid meal_type", () => {
    const result = nutritionLogSchema.safeParse({ ...base, meal_type: "brunch" })
    expect(result.success).toBe(false)
  })

  it("accepts numeric macros", () => {
    const result = nutritionLogSchema.safeParse({
      ...base,
      calories: 450,
      protein_g: 30,
      carbs_g: 60,
      fat_g: 10,
    })
    expect(result.success).toBe(true)
  })

  it("rejects negative calories", () => {
    const result = nutritionLogSchema.safeParse({ ...base, calories: -1 })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer calories", () => {
    const result = nutritionLogSchema.safeParse({ ...base, calories: 1.5 })
    expect(result.success).toBe(false)
  })

  it("accepts nulls for macros", () => {
    const result = nutritionLogSchema.safeParse({
      ...base,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
    })
    expect(result.success).toBe(true)
  })

  it("rejects photo_url that is not https", () => {
    const result = nutritionLogSchema.safeParse({
      ...base,
      photo_url: "javascript:alert(1)",
    })
    expect(result.success).toBe(false)
  })

  it("accepts https photo_url", () => {
    const result = nutritionLogSchema.safeParse({
      ...base,
      photo_url: "https://cdn.example.com/a.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("accepts null photo_url", () => {
    const result = nutritionLogSchema.safeParse({ ...base, photo_url: null })
    expect(result.success).toBe(true)
  })
})
