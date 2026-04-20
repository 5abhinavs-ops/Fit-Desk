/**
 * Client-safe E.164 phone validator. Duplicates `isValidE164` from twilio-sms.ts
 * so client components can import a validator without pulling the Twilio SDK
 * (which requires Node-only modules like `tls`) into the browser bundle.
 */

const E164_RE = /^\+\d{8,15}$/

export function isValidE164Phone(phone: string): boolean {
  return E164_RE.test(phone)
}
