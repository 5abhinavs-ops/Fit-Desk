import { createServiceClient } from "@/lib/supabase/service"

interface SessionTokenResult {
  token: string
  expires_at: string
}

interface ValidatedToken {
  id: string
  booking_id: string
  token: string
  expires_at: string
  used_at: string | null
}

/**
 * Generate a session token for a booking.
 * Token expires at the booking's date_time.
 * Uses service client (no RLS on session_tokens).
 */
export async function generateSessionToken(
  bookingId: string,
  sessionDatetime: string,
): Promise<SessionTokenResult | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("session_tokens")
    .insert({
      booking_id: bookingId,
      expires_at: sessionDatetime,
    })
    .select("token, expires_at")
    .single()

  if (error || !data) return null
  return data
}

/**
 * Validate a session token. Returns token data if valid, null if expired/used/not found.
 */
export async function validateSessionToken(
  token: string,
): Promise<ValidatedToken | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("session_tokens")
    .select("id, booking_id, token, expires_at, used_at")
    .eq("token", token)
    .single()

  if (error || !data) return null
  if (data.used_at) return null
  if (new Date(data.expires_at) < new Date()) return null

  return data
}

/**
 * Get or create a session token for a booking.
 * If a valid (unused, unexpired) token already exists, return it.
 * Otherwise create a new one.
 */
export async function getOrCreateSessionToken(
  bookingId: string,
  sessionDatetime: string,
): Promise<string | null> {
  const supabase = createServiceClient()

  // Check for existing valid token
  const { data: existing } = await supabase
    .from("session_tokens")
    .select("token, expires_at, used_at")
    .eq("booking_id", bookingId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing.token

  const result = await generateSessionToken(bookingId, sessionDatetime)
  return result?.token ?? null
}
