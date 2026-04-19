const DEFAULT_MESSAGE = "Book your next session with me:"

// Build an https://wa.me/?text=... deep link. We deliberately avoid
// whatsapp://send?text=... because that scheme silently no-ops on desktop
// browsers without WhatsApp Desktop installed. The wa.me URL works on both
// mobile and desktop, and matches the https-only guards used elsewhere in
// the codebase (see safeExternalHref in src/components/ui/empty-state.tsx).
export function buildWhatsappShareUrl(
  shareUrl: string,
  message: string = DEFAULT_MESSAGE
): string {
  const composed = `${message} ${shareUrl}`
  return `https://wa.me/?text=${encodeURIComponent(composed)}`
}
