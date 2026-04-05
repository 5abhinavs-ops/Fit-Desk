import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/twilio"
import { format } from "date-fns"

const BulkCancelSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(["restore", "forfeit", "cancel_day"]),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = BulkCancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { booking_ids, action } = parsed.data

  // Verify all bookings belong to this trainer (RLS-scoped)
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, date_time, client_id, package_id, clients(first_name, whatsapp_number)")
    .in("id", booking_ids)
    .eq("trainer_id", user.id)
    .in("status", ["confirmed", "pending", "upcoming"])

  if (error) return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ error: "No valid bookings found" }, { status: 404 })
  }

  // For cancel_day: verify all bookings share the same date
  if (action === "cancel_day") {
    const dates = new Set(bookings.map((b) => b.date_time.split("T")[0]))
    if (dates.size > 1) {
      return NextResponse.json({ error: "All bookings must be on the same date for cancel_day" }, { status: 400 })
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, booking_slug")
    .eq("id", user.id)
    .single()

  const trainerName = profile?.name || "Your trainer"
  const bookingLink = profile?.booking_slug
    ? `${process.env.NEXT_PUBLIC_APP_URL}/book/${profile.booking_slug}`
    : ""
  let cancelled = 0

  for (const booking of bookings) {
    const newStatus = action === "cancel_day" ? "cancelled" : action === "restore" ? "cancelled" : "forfeited"

    // Use RLS-scoped client — RLS policy enforces trainer_id ownership
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: newStatus,
        cancelled_at: new Date().toISOString(),
        cancelled_by: "pt",
        cancellation_reason: action === "cancel_day"
          ? "Day cancelled by trainer"
          : "Trainer blocked this time slot",
      })
      .eq("id", booking.id)

    if (updateError) continue

    cancelled++

    // Send WhatsApp notification — don't abort loop on notification failure
    try {
      const client = booking.clients as unknown as { first_name: string; whatsapp_number: string } | null
      if (client) {
        const dt = new Date(booking.date_time)

        if (action === "cancel_day") {
          await sendTemplateMessage({
            whatsappNumber: client.whatsapp_number,
            templateName: "session_cancelled_reschedule",
            parameters: [
              { name: "client_name", value: client.first_name },
              { name: "day_date", value: format(dt, "EEEE, d MMMM") },
              { name: "time", value: format(dt, "h:mm a") },
              { name: "booking_link", value: bookingLink },
            ],
          })
        } else {
          const templateName = action === "restore"
            ? "booking_cancelled_restore"
            : "booking_cancelled_forfeit"

          await sendTemplateMessage({
            whatsappNumber: client.whatsapp_number,
            templateName,
            parameters: [
              { name: "client_name", value: client.first_name },
              { name: "date", value: format(dt, "EEEE, d MMMM") },
              { name: "time", value: format(dt, "h:mm a") },
              { name: "trainer_name", value: trainerName },
            ],
          })
        }
      }
    } catch {
      // Notification failure should not block cancellation
    }
  }

  // For cancel_day: insert a full-day block (check first to avoid duplicates)
  let blocked = false
  if (action === "cancel_day" && bookings.length > 0) {
    const blockDate = bookings[0].date_time.split("T")[0]
    const { data: existingBlock } = await supabase
      .from("pt_blocked_slots")
      .select("id")
      .eq("trainer_id", user.id)
      .eq("date", blockDate)
      .is("start_time", null)
      .limit(1)

    if (!existingBlock || existingBlock.length === 0) {
      const { error: blockError } = await supabase
        .from("pt_blocked_slots")
        .insert({
          trainer_id: user.id,
          date: blockDate,
          start_time: null,
          end_time: null,
          reason: "Day cancelled by trainer",
        })

      if (blockError) {
        return NextResponse.json({
          success: true,
          cancelled,
          blocked: false,
          blockError: "Failed to block day",
        })
      }
    }
    blocked = true
  }

  return NextResponse.json({
    success: true,
    cancelled,
    ...(action === "cancel_day" ? { blocked } : {}),
  })
}
