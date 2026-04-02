import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/twilio"
import { format } from "date-fns"

const ActionSchema = z.object({
  action: z.enum(["confirm", "late", "reschedule", "payment_confirm"]),
  late_minutes: z.number().int().min(1).max(120).optional(),
  reason: z.string().optional(),
})

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params
  const supabase = createServiceClient()

  // Validate token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, booking_id, expires_at, used_at")
    .eq("token", token)
    .single()

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 })
  }

  if (tokenRow.used_at) {
    return NextResponse.json({ error: "This link has already been used" }, { status: 403 })
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { action, late_minutes } = parsed.data

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*, clients(first_name, whatsapp_number), profiles:trainer_id(name, whatsapp_number)")
    .eq("id", tokenRow.booking_id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const client = booking.clients as unknown as { first_name: string; whatsapp_number: string }
  const trainer = booking.profiles as unknown as { name: string; whatsapp_number: string }
  const dt = new Date(booking.date_time)
  const dateStr = format(dt, "EEEE, d MMMM")
  const timeStr = format(dt, "h:mm a")
  const now = new Date().toISOString()

  switch (action) {
    case "confirm": {
      await supabase
        .from("bookings")
        .update({ attendance_confirmed_at: now })
        .eq("id", booking.id)

      // Mark token as used
      await supabase
        .from("session_tokens")
        .update({ used_at: now })
        .eq("id", tokenRow.id)

      await sendTemplateMessage({
        whatsappNumber: trainer.whatsapp_number,
        templateName: "session_confirm_attendance",
        parameters: [
          { name: "trainer_name", value: trainer.name },
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
          { name: "time", value: timeStr },
        ],
      })

      return NextResponse.json({ success: true, action: "confirm" })
    }

    case "late": {
      const minutes = late_minutes ?? 10

      await supabase
        .from("bookings")
        .update({ late_minutes: minutes })
        .eq("id", booking.id)

      // Mark token as used
      await supabase
        .from("session_tokens")
        .update({ used_at: now })
        .eq("id", tokenRow.id)

      await sendTemplateMessage({
        whatsappNumber: trainer.whatsapp_number,
        templateName: "session_running_late",
        parameters: [
          { name: "trainer_name", value: trainer.name },
          { name: "client_name", value: client.first_name },
          { name: "late_minutes", value: String(minutes) },
          { name: "time", value: timeStr },
        ],
      })

      return NextResponse.json({ success: true, action: "late" })
    }

    case "reschedule": {
      // Mark token as used
      await supabase
        .from("session_tokens")
        .update({ used_at: now })
        .eq("id", tokenRow.id)

      await sendTemplateMessage({
        whatsappNumber: trainer.whatsapp_number,
        templateName: "session_reschedule_request",
        parameters: [
          { name: "trainer_name", value: trainer.name },
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
          { name: "time", value: timeStr },
        ],
      })

      return NextResponse.json({ success: true, action: "reschedule" })
    }

    case "payment_confirm": {
      // Check current payment status
      if (booking.payment_status === "paid" || booking.payment_status === "waived") {
        return NextResponse.json({
          success: true,
          action: "payment_confirm",
          message: "Payment already confirmed by your PT",
        })
      }

      // Only update if currently unpaid
      if (booking.payment_status === "unpaid") {
        await supabase
          .from("bookings")
          .update({
            payment_status: "client_confirmed",
            client_paid_at: now,
          })
          .eq("id", booking.id)
      }

      // Do NOT mark token as used — client may still need other actions
      // Send notification to PT
      await sendTemplateMessage({
        whatsappNumber: trainer.whatsapp_number,
        templateName: "pt_payment_confirmed",
        parameters: [
          { name: "trainer_name", value: trainer.name },
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
        ],
      })

      return NextResponse.json({
        success: true,
        action: "payment_confirm",
        message: "Payment marked — your PT will confirm shortly",
      })
    }
  }
}
