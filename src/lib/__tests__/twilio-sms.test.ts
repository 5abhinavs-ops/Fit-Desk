import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// RED state: src/lib/twilio-sms.ts does not exist yet.
// Tests below cover (1) buildMagicLinkSms pure formatter and (2) sendSms Twilio wrapper.

const messagesCreate = vi.fn()

vi.mock("twilio", () => {
  const twilioFactory = vi.fn(() => ({
    messages: { create: messagesCreate },
  }))
  return { default: twilioFactory }
})

describe("buildMagicLinkSms", () => {
  it("produces the exact SMS template copy with the link interpolated", async () => {
    const { buildMagicLinkSms } = await import("../twilio-sms")
    const link = "https://example.supabase.co/auth/v1/verify?token=abc"
    expect(buildMagicLinkSms(link)).toBe(
      `Tap to log in to FitDesk: ${link}. Expires in 10 minutes. Don't share.`,
    )
  })

  it("has no trailing whitespace", async () => {
    const { buildMagicLinkSms } = await import("../twilio-sms")
    const out = buildMagicLinkSms("https://x.co/a")
    expect(out).toBe(out.trim())
  })
})

describe("sendSms", () => {
  beforeEach(() => {
    vi.resetModules()
    messagesCreate.mockReset()
    process.env.TWILIO_ACCOUNT_SID = "ACtest"
    process.env.TWILIO_AUTH_TOKEN = "authtest"
    process.env.TWILIO_SMS_FROM = "+15005550006"
  })

  afterEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_SMS_FROM
  })

  it("returns { success: true, sid } when Twilio accepts the send", async () => {
    messagesCreate.mockResolvedValueOnce({ sid: "SM123" })
    const { sendSms } = await import("../twilio-sms")
    const result = await sendSms({ to: "+6591234567", body: "hi" })
    expect(result).toEqual({ success: true, sid: "SM123" })
    expect(messagesCreate).toHaveBeenCalledWith({
      to: "+6591234567",
      from: "+15005550006",
      body: "hi",
    })
  })

  it("returns { success: false, error } when Twilio rejects the send", async () => {
    messagesCreate.mockRejectedValueOnce(new Error("invalid 'To' Phone Number"))
    const { sendSms } = await import("../twilio-sms")
    const result = await sendSms({ to: "bad", body: "hi" })
    expect(result.success).toBe(false)
    expect(result.error).toContain("invalid")
  })

  it("returns { success: false, error } when env vars are missing (does not throw)", async () => {
    delete process.env.TWILIO_SMS_FROM
    const { sendSms } = await import("../twilio-sms")
    const result = await sendSms({ to: "+6591234567", body: "hi" })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not configured/i)
    expect(messagesCreate).not.toHaveBeenCalled()
  })
})

describe("isValidE164", () => {
  it("accepts +6591234567", async () => {
    const { isValidE164 } = await import("../twilio-sms")
    expect(isValidE164("+6591234567")).toBe(true)
  })

  it("rejects missing plus prefix", async () => {
    const { isValidE164 } = await import("../twilio-sms")
    expect(isValidE164("6591234567")).toBe(false)
  })

  it("rejects non-digits after plus", async () => {
    const { isValidE164 } = await import("../twilio-sms")
    expect(isValidE164("+65abcd")).toBe(false)
  })

  it("rejects too short", async () => {
    const { isValidE164 } = await import("../twilio-sms")
    expect(isValidE164("+1234567")).toBe(false)
  })

  it("rejects too long", async () => {
    const { isValidE164 } = await import("../twilio-sms")
    expect(isValidE164("+1234567890123456")).toBe(false)
  })
})
