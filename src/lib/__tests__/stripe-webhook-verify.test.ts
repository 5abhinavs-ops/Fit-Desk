import { describe, it, expect } from "vitest"
import {
  authoriseCheckoutCompletion,
  type ProfileRow,
} from "../stripe-webhook-verify"

describe("authoriseCheckoutCompletion", () => {
  const baseProfile: ProfileRow = {
    id: "user-1",
    email: "pt@example.com",
    stripe_customer_id: null,
  }

  it("rejects when metadata.user_id is missing", () => {
    const result = authoriseCheckoutCompletion({
      metadata: {},
      sessionCustomerId: "cus_123",
      sessionCustomerEmail: "pt@example.com",
      profile: null,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/missing user_id/i)
  })

  it("rejects when metadata.user_id is blank string", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "  " },
      sessionCustomerId: "cus_123",
      sessionCustomerEmail: "pt@example.com",
      profile: null,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/missing user_id/i)
  })

  it("rejects when profile does not exist (tampered metadata.user_id)", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "attacker-guessed-uuid" },
      sessionCustomerId: "cus_123",
      sessionCustomerEmail: "attacker@example.com",
      profile: null,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/profile not found/i)
  })

  it("rejects when session.customer is missing", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: null,
      sessionCustomerEmail: "pt@example.com",
      profile: baseProfile,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/missing customer/i)
  })

  it("allows first-time upgrade when profile email matches session email", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_new",
      sessionCustomerEmail: "pt@example.com",
      profile: baseProfile,
    })
    expect(result.allowed).toBe(true)
  })

  it("allows first-time upgrade when emails match with different casing", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_new",
      sessionCustomerEmail: "PT@Example.COM",
      profile: baseProfile,
    })
    expect(result.allowed).toBe(true)
  })

  it("rejects first-time upgrade when session email does not match profile email", () => {
    // Attack: attacker creates a session with victim's metadata.user_id but
    // attacker's own email. Victim has no stripe_customer_id yet so the old
    // customer-id check would pass. The email guard catches this.
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_attacker",
      sessionCustomerEmail: "attacker@evil.com",
      profile: baseProfile,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/email mismatch/i)
  })

  it("rejects first-time upgrade when profile email is null", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_new",
      sessionCustomerEmail: "pt@example.com",
      profile: { ...baseProfile, email: null },
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/missing email/i)
  })

  it("rejects first-time upgrade when session email is null", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_new",
      sessionCustomerEmail: null,
      profile: baseProfile,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/missing email/i)
  })

  it("allows re-subscribe when profile customer matches session customer (emails ignored)", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_existing",
      sessionCustomerEmail: "anything@example.com",
      profile: {
        id: "user-1",
        email: "pt@example.com",
        stripe_customer_id: "cus_existing",
      },
    })
    expect(result.allowed).toBe(true)
  })

  it("rejects when metadata.user_id does not match profile's existing customer", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "victim" },
      sessionCustomerId: "cus_attacker",
      sessionCustomerEmail: "pt@example.com",
      profile: {
        id: "victim",
        email: "pt@example.com",
        stripe_customer_id: "cus_victim_real",
      },
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/customer mismatch/i)
  })

  it("rejects when profile id does not equal metadata.user_id", () => {
    const result = authoriseCheckoutCompletion({
      metadata: { user_id: "user-1" },
      sessionCustomerId: "cus_123",
      sessionCustomerEmail: "pt@example.com",
      profile: { id: "user-2", email: "pt@example.com", stripe_customer_id: null },
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/profile id mismatch/i)
  })
})
