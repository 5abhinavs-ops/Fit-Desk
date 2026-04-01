/**
 * Normalises a WhatsApp number to E.164 format for Twilio API compatibility.
 * Handles SG, MY, ID, PH input patterns.
 * Returns the raw string unchanged if the pattern is unrecognised.
 * @pure — no side effects, no I/O
 */
export function formatWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")

  // Already has + prefix with valid international format
  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }

  // Singapore local: 8-digit number starting with 8 or 9
  if (digits.length === 8 && (digits.startsWith("8") || digits.startsWith("9"))) {
    return `+65${digits}`
  }

  // Singapore with country code: 65XXXXXXXX (10 digits)
  if (digits.startsWith("65") && digits.length === 10) {
    return `+${digits}`
  }

  // Malaysia local: 01X-XXXX-XXXX (10-11 digits starting with 0)
  // Prefixes: 010, 011, 012, 013, 014, 015, 016, 017, 018, 019
  if (digits.startsWith("0") && digits.length >= 10 && digits.length <= 11) {
    const withoutLeadingZero = digits.slice(1)
    if (withoutLeadingZero.startsWith("1")) {
      return `+60${withoutLeadingZero}`
    }
  }

  // International format with country code (MY 60, ID 62, PH 63)
  if (
    (digits.startsWith("60") || digits.startsWith("62") || digits.startsWith("63")) &&
    digits.length >= 10 &&
    digits.length <= 15
  ) {
    return `+${digits}`
  }

  return raw
}
