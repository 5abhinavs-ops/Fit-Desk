import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { format } from "date-fns"

const CancelSchema = z.object({
  booking_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Verify booking belongs to this client
  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "*, clients!inner(id, auth_user_id, first_name, last_name, trainer_id)"
    )
    .eq("id", parsed.data.booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const client = booking.clients as unknown as {
    id: string
    auth_user_id: string | null
    first_name: string
    last_name: string
    trainer_id: string
  }

  if (client.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Only allow cancellation of active bookings
  const cancellableStatuses = ["confirmed", "pending", "upcoming", "pending_approval"]
  if (!cancellableStatuses.includes(booking.status)) {
    return NextResponse.json(
      { error: "This booking cannot be cancelled" },
      { status: 409 }
    )
  }

  // Check cancellation policy
  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("cancellation_policy_hours, whatsapp_number")
    .eq("id", client.trainer_id)
    .single()

  const policyHours = trainerProfile?.cancellation_policy_hours ?? 24
  const sessionTime = new Date(booking.date_time).getTime()
  const hoursUntil = (sessionTime - Date.now()) / (1000 * 60 * 60)
  const forfeited = hoursUntil < policyHours

  // Update booking
  const newStatus = forfeited ? "forfeited" : "cancelled"
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      status: newStatus,
      cancelled_at: new Date().toISOString(),
      cancelled_by: "client",
      cancellation_reason: "Client cancelled via app",
    })
    .eq("id", booking.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    )
  }

  // Notify PT via WhatsApp
  if (trainerProfile?.whatsapp_number) {
    const dateStr = format(new Date(booking.date_time), "d MMM yyyy")
    const timeStr = format(new Date(booking.date_time), "h:mm a")
    await sendTemplateMessage({
      whatsappNumber: trainerProfile.whatsapp_number,
      templateName: "session_cancelled_by_client",
      parameters: [
        { name: "1", value: `${client.first_name} ${client.last_name}` },
        { name: "2", value: dateStr },
        { name: "3", value: timeStr },
      ],
    })
  }

  return NextResponse.json({ success: true, forfeited })
}
