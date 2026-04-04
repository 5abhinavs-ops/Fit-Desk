import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/twilio"
import { format } from "date-fns"

const BulkCancelSchema = z.object({
  booking_ids: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(["restore", "forfeit"]),
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
  const serviceClient = createServiceClient()

  // Verify all bookings belong to this trainer
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  const trainerName = profile?.name || "Your trainer"
  let cancelled = 0

  for (const booking of bookings) {
    const newStatus = action === "restore" ? "cancelled" : "forfeited"

    const { error: updateError } = await serviceClient
      .from("bookings")
      .update({
        status: newStatus,
        cancelled_at: new Date().toISOString(),
        cancelled_by: "pt",
        cancellation_reason: "Trainer blocked this time slot",
      })
      .eq("id", booking.id)
      .eq("trainer_id", user.id)

    if (updateError) continue

    cancelled++

    // Send WhatsApp notification — don't abort loop on notification failure
    try {
      const client = booking.clients as unknown as { first_name: string; whatsapp_number: string } | null
      if (client) {
        const dt = new Date(booking.date_time)
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
    } catch {
      // Notification failure should not block cancellation
    }
  }

  return NextResponse.json({ success: true, cancelled })
}
