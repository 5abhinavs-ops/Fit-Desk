import twilio from "twilio"

interface SendSmsParams {
  to: string
  body: string
}

interface SendSmsResult {
  success: boolean
  sid?: string
  error?: string
}

/**
 * Fixed SMS template for client magic-link login.
 * Uses ASCII apostrophe so the message stays on GSM-7 (160-char segments)
 * instead of falling back to UCS-2 (70-char segments, 2x Twilio cost).
 * Pure function — safe to unit test without mocks.
 */
export function buildMagicLinkSms(link: string): string {
  return `Tap to log in to FitDesk: ${link}. Expires in 10 minutes. Don't share.`
}

/**
 * E.164 format guard for Twilio SMS destination numbers.
 * Accepts a literal `+` followed by 8–15 digits.
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone)
}

/**
 * Send an SMS via Twilio. Constructs a fresh client per call so that
 * rotated credentials (env var change on redeploy) take effect immediately
 * without relying on a cold start to clear a module-level cache.
 * Returns structured errors instead of throwing on missing env vars.
 */
export async function sendSms({ to, body }: SendSmsParams): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SMS_FROM

  if (!accountSid || !authToken || !from) {
    return { success: false, error: "Twilio SMS not configured" }
  }

  try {
    const client = twilio(accountSid, authToken)
    const message = await client.messages.create({ to, from, body })
    return { success: true, sid: message.sid }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Twilio SMS send failed",
    }
  }
}
