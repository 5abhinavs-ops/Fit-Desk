/**
 * Pure authorization helpers for Stripe webhook events.
 *
 * Threat model: Stripe signs the webhook payload, so an external attacker
 * cannot forge events. However, `metadata.user_id` is attacker-controllable in
 * any code path that creates checkout sessions, so trusting it blindly would
 * let one payment flip another user's subscription flag. These guards enforce:
 *
 *   1. `metadata.user_id` exists and corresponds to a real profile.
 *   2. The session has a `customer` attached.
 *   3. If the profile already has a `stripe_customer_id`, the session customer
 *      matches it (prevents binding a new attacker customer onto a victim).
 *   4. On a first-time upgrade (profile has no existing customer), the email
 *      captured on the Stripe session must match the profile's email — this is
 *      the tamper check for the very first checkout.
 */

export interface ProfileRow {
  id: string
  email: string | null
  stripe_customer_id: string | null
}

export interface AuthoriseInput {
  metadata: Record<string, string> | null | undefined
  sessionCustomerId: string | null | undefined
  sessionCustomerEmail: string | null | undefined
  profile: ProfileRow | null
}

export interface AuthoriseResult {
  allowed: boolean
  reason?: string
}

function normaliseEmail(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function authoriseCheckoutCompletion(input: AuthoriseInput): AuthoriseResult {
  const rawUserId = input.metadata?.user_id
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : ""

  if (!userId) {
    return { allowed: false, reason: "missing user_id in metadata" }
  }

  if (!input.sessionCustomerId) {
    return { allowed: false, reason: "missing customer on session" }
  }

  if (!input.profile) {
    return { allowed: false, reason: "profile not found for user_id" }
  }

  if (input.profile.id !== userId) {
    return { allowed: false, reason: "profile id mismatch with metadata.user_id" }
  }

  const existing = input.profile.stripe_customer_id
  if (existing) {
    if (existing !== input.sessionCustomerId) {
      return { allowed: false, reason: "customer mismatch against profile" }
    }
    return { allowed: true }
  }

  // First-time upgrade: no prior customer to anchor against. Require the
  // session email to match the profile email as the tamper guard.
  const profileEmail = normaliseEmail(input.profile.email)
  const sessionEmail = normaliseEmail(input.sessionCustomerEmail)
  if (!profileEmail || !sessionEmail) {
    return { allowed: false, reason: "missing email on first upgrade" }
  }
  if (profileEmail !== sessionEmail) {
    return { allowed: false, reason: "email mismatch on first upgrade" }
  }

  return { allowed: true }
}
