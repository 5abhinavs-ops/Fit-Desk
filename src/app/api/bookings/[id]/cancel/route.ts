import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/twilio"
import { format } from "date-fns"

const CancelSchema = z.object({
  reason: z.string().optional(),
  token: z.string().min(1, "Token is required"),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id: bookingId } = await context.params
  const supabase = createServiceClient()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { reason, token } = parsed.data

  // Validate session token
  const { data: sessionToken, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, booking_id, expires_at, used_at")
    .eq("token", token)
    .single()

  if (tokenError || !sessionToken) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
  }

  if (sessionToken.used_at) {
    return NextResponse.json({ error: "This link has already been used" }, { status: 403 })
  }

  if (new Date(sessionToken.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 403 })
  }

  if (sessionToken.booking_id !== bookingId) {
    return NextResponse.json({ error: "Token does not match this booking" }, { status: 403 })
  }

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*, clients(first_name, whatsapp_number), profiles:trainer_id(name, whatsapp_number, cancellation_policy_hours)")
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (!["upcoming", "confirmed", "pending", "pending_approval"].includes(booking.status)) {
    return NextResponse.json({ error: "This booking cannot be cancelled" }, { status: 400 })
  }

  const client = booking.clients as unknown as { first_name: string; whatsapp_number: string }
  const trainer = booking.profiles as unknown as {
    name: string
    whatsapp_number: string
    cancellation_policy_hours: number
  }

  const dt = new Date(booking.date_time)
  const now = new Date()
  const hoursUntilSession = (dt.getTime() - now.getTime()) / (1000 * 60 * 60)
  const withinPolicy = hoursUntilSession >= trainer.cancellation_policy_hours

  let newStatus: string
  if (withinPolicy) {
    newStatus = "cancelled"
    // Restore session to package if applicable
    if (booking.package_id) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("sessions_used")
        .eq("id", booking.package_id)
        .single()

      if (pkg && pkg.sessions_used > 0) {
        await supabase
          .from("packages")
          .update({ sessions_used: pkg.sessions_used - 1, status: "active" })
          .eq("id", booking.package_id)
      }
    }
  } else {
    newStatus = "forfeited"
  }

  // Update booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: newStatus,
      cancelled_by: "client",
      cancelled_at: now.toISOString(),
      cancellation_reason: reason || null,
    })
    .eq("id", bookingId)

  if (updateError) {
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 })
  }

  // Mark token as used
  await supabase
    .from("session_tokens")
    .update({ used_at: now.toISOString() })
    .eq("id", sessionToken.id)

  const dateStr = format(dt, "EEEE, d MMMM")
  const timeStr = format(dt, "h:mm a")
  const outcomeText = withinPolicy ? "Session restored to package" : "Session forfeited per cancellation policy"

  // Notify PT via WhatsApp
  await sendTemplateMessage({
    whatsappNumber: trainer.whatsapp_number,
    templateName: "booking_cancelled_by_client",
    parameters: [
      { name: "trainer_name", value: trainer.name },
      { name: "client_name", value: client.first_name },
      { name: "date", value: dateStr },
      { name: "time", value: timeStr },
      { name: "outcome", value: outcomeText },
    ],
  })

  return NextResponse.json({
    success: true,
    status: newStatus,
    withinPolicy,
    message: withinPolicy
      ? "Booking cancelled. Your session has been restored."
      : "Booking cancelled. As per the cancellation policy, this session has been forfeited.",
  })
}
