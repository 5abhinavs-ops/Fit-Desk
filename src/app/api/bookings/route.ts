import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const BookingRequestSchema = z.object({
  trainer_id: z.string().uuid(),
  client_name: z.string().min(2),
  client_whatsapp: z.string().min(8),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  preferred_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  session_type: z.enum(["1-on-1", "group", "assessment"]),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  // Rate limit: 10 requests per IP per minute
  const ip = getClientIp(request)
  const limit = checkRateLimit(`booking:${ip}`, 10, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    )
  }

  const supabase = createServiceClient()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = BookingRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { trainer_id, client_name, client_whatsapp, preferred_date, preferred_time, session_type, notes } = parsed.data
  const normalisedWhatsapp = formatWhatsappNumber(client_whatsapp)
  const [firstName, ...rest] = client_name.split(" ")
  const lastName = rest.join(" ") || "-"

  // Verify trainer_id corresponds to a real profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, name, whatsapp_number, default_booking_payment_mode, default_session_mins, booking_approval_required")
    .eq("id", trainer_id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Trainer not found" }, { status: 404 })
  }

  // Upsert client by whatsapp number
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("trainer_id", trainer_id)
    .eq("whatsapp_number", normalisedWhatsapp)
    .single()

  let clientId: string
  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error } = await supabase.from("clients").insert({
      trainer_id,
      first_name: firstName,
      last_name: lastName,
      whatsapp_number: normalisedWhatsapp,
      status: "active",
    }).select("id").single()
    if (error || !newClient) return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
    clientId = newClient.id
  }

  // Build date_time from preferred_date + preferred_time (stored as UTC)
  const dateTime = new Date(`${preferred_date}T${preferred_time}:00`).toISOString()

  const needsApproval = profile.booking_approval_required ?? true
  const bookingStatus = needsApproval ? "pending_approval" : "upcoming"

  const { data: booking, error } = await supabase.from("bookings").insert({
    trainer_id,
    client_id: clientId,
    date_time: dateTime,
    duration_mins: profile.default_session_mins ?? 60,
    session_type,
    status: bookingStatus,
    booking_source: "client_link",
    payment_mode: profile.default_booking_payment_mode || "pay_later",
    client_intake_notes: notes || null,
    reminder_24h_sent: false,
    reminder_1h_sent: false,
  }).select("id").single()

  if (error || !booking) return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })

  if (needsApproval) {
    // Create booking approval row
    await supabase.from("booking_approvals").insert({
      booking_id: booking.id,
      status: "pending",
    })

    // Notify PT via WhatsApp
    await sendTemplateMessage({
      whatsappNumber: profile.whatsapp_number,
      templateName: "booking_pending_approval",
      parameters: [
        { name: "trainer_name", value: profile.name },
        { name: "client_name", value: client_name },
        { name: "date", value: preferred_date },
        { name: "time", value: preferred_time },
      ],
    })

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      pendingApproval: true,
      message: `Your booking request has been sent to ${profile.name}. You will receive a confirmation once approved.`,
    })
  }

  // Notify PT of new auto-approved booking
  try {
    await sendTemplateMessage({
      whatsappNumber: profile.whatsapp_number,
      templateName: "new_booking_request",
      parameters: [
        { name: "trainer_name", value: profile.name },
        { name: "client_name", value: client_name },
        { name: "date", value: preferred_date },
        { name: "time", value: preferred_time },
        { name: "session_type", value: session_type },
      ],
    })
  } catch {
    // Notification failure must not block the booking response
  }

  return NextResponse.json({ success: true, bookingId: booking.id })
}
