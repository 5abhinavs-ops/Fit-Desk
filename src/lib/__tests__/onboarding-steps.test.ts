import { describe, it, expect } from "vitest"
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_KEYS,
  countCompletedSteps,
  isAllStepsComplete,
} from "../onboarding-steps"

describe("ONBOARDING_STEPS keys", () => {
  it("exposes exactly three step keys", () => {
    expect(ONBOARDING_STEP_KEYS).toHaveLength(3)
  })

  it("includes client_added, availability_set, link_shared", () => {
    expect(ONBOARDING_STEP_KEYS).toEqual([
      ONBOARDING_STEPS.CLIENT_ADDED,
      ONBOARDING_STEPS.AVAILABILITY_SET,
      ONBOARDING_STEPS.LINK_SHARED,
    ])
  })
})

describe("countCompletedSteps", () => {
  it("returns 0 for null", () => {
    expect(countCompletedSteps(null)).toBe(0)
  })

  it("returns 0 for undefined", () => {
    expect(countCompletedSteps(undefined)).toBe(0)
  })

  it("returns 0 for empty object", () => {
    expect(countCompletedSteps({})).toBe(0)
  })

  it("returns 1 when one step is true", () => {
    expect(countCompletedSteps({ client_added: true })).toBe(1)
  })

  it("returns 3 when all three are true", () => {
    expect(
      countCompletedSteps({
        client_added: true,
        availability_set: true,
        link_shared: true,
      })
    ).toBe(3)
  })

  it("ignores extra keys not in the step list", () => {
    expect(
      countCompletedSteps({
        client_added: true,
        // @ts-expect-error — intentionally unknown key to guard against drift
        bogus: true,
      })
    ).toBe(1)
  })

  it("treats false values as not completed", () => {
    expect(
      countCompletedSteps({
        client_added: false,
        availability_set: false,
        link_shared: false,
      })
    ).toBe(0)
  })
})

describe("isAllStepsComplete", () => {
  it("returns false for null", () => {
    expect(isAllStepsComplete(null)).toBe(false)
  })

  it("returns false when only two of three are complete", () => {
    expect(
      isAllStepsComplete({
        client_added: true,
        availability_set: true,
      })
    ).toBe(false)
  })

  it("returns true when all three are complete", () => {
    expect(
      isAllStepsComplete({
        client_added: true,
        availability_set: true,
        link_shared: true,
      })
    ).toBe(true)
  })
})
