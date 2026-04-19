import type { TemplateParam } from "@/lib/whatsapp"

export interface BookingConfirmationInput {
  trainerName: string
  clientName: string
  dateIso: string
  time: string
  sessionType: string
  location: string | null | undefined
}

// SGT formatter — renders the date in the trainer's (Singapore) local time
// regardless of server timezone. Uses formatToParts + manual assembly so
// locale-specific separators (e.g. en-GB's comma after weekday) don't
// leak into the template parameter. Output: "Tuesday 22 April".
const SGT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Singapore",
})

function formatSgtDate(d: Date): string {
  const parts = SGT_DATE_FORMATTER.formatToParts(d)
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? ""
  const day = parts.find((p) => p.type === "day")?.value ?? ""
  const month = parts.find((p) => p.type === "month")?.value ?? ""
  return `${weekday} ${day} ${month}`.trim()
}

// Phase L — parameter builder for the new_booking_request WhatsApp template.
// Body construction is warm: date formatted as "Tuesday 22 April" in SGT,
// location surfaced when set, and a 💪 closing for the template to append.
// The template name itself is unchanged (see DECISIONS.md D-L14).
export function buildBookingConfirmationParams(
  input: BookingConfirmationInput
): TemplateParam[] {
  const when = new Date(input.dateIso)
  const dateFormatted = formatSgtDate(when)

  return [
    { name: "trainer_name", value: input.trainerName },
    { name: "client_name", value: input.clientName },
    { name: "date_formatted", value: dateFormatted },
    { name: "time", value: input.time },
    { name: "session_type", value: input.sessionType },
    { name: "location", value: input.location ?? "" },
    { name: "closing", value: "💪" },
  ]
}
