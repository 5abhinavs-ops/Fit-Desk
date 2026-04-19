const KNOWN_LABELS: Record<string, string> = {
  session_reminder_24h_with_link: "24-hour session reminder",
  session_reminder_1h: "1-hour session reminder",
  package_low_sessions: "Package running low",
  new_booking_request: "New booking request",
  booking_pending_approval: "Booking pending approval",
  booking_approved: "Booking approved",
  booking_cancelled: "Booking cancelled",
  payment_due_today: "Payment due today",
  payment_overdue_day_1: "Payment overdue — 1 day",
  payment_overdue_day_3: "Payment overdue — 3 days",
  payment_overdue_day_7: "Payment overdue — 7 days",
  client_uploaded_proof: "Client uploaded payment proof",
  request_payment_proof: "Request payment proof",
  package_renewal: "Package renewal reminder",
  session_cancelled_reschedule: "Session cancelled — reschedule",
}

function titleCase(input: string): string {
  if (input === "") return ""
  return input
    .split("_")
    .map((word) =>
      word.length === 0 ? "" : word[0].toUpperCase() + word.slice(1)
    )
    .join(" ")
}

export function getTemplateLabel(templateName: string): string {
  if (templateName in KNOWN_LABELS) return KNOWN_LABELS[templateName]
  return titleCase(templateName)
}
