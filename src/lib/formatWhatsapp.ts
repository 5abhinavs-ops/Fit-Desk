/**
 * Normalises a WhatsApp number to E.164 format for WATI API compatibility.
 * Handles SG, MY, ID, PH input patterns.
 * Returns the raw string unchanged if the pattern is unrecognised.
 * @pure — no side effects, no I/O
 */
export function formatWhatsappNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")

  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }
  if (digits.length === 8 && (digits.startsWith("8") || digits.startsWith("9"))) {
    return `+65${digits}`
  }
  if (digits.startsWith("65") && digits.length === 10) {
    return `+${digits}`
  }
  if (
    (digits.startsWith("60") || digits.startsWith("62") || digits.startsWith("63")) &&
    digits.length >= 10 &&
    digits.length <= 15
  ) {
    return `+${digits}`
  }
  return raw
}
