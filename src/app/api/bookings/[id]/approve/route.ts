import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { format } from "date-fns"

const ApproveSchema = z.object({
  decision: z.enum(["approved", "declined"]),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { id: bookingId } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { decision } = parsed.data

  // Fetch booking and verify ownership
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*, clients(first_name, whatsapp_number), profiles:trainer_id(name)")
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (booking.trainer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (booking.status !== "pending_approval") {
    return NextResponse.json({ error: "Booking is not pending approval" }, { status: 400 })
  }

  const client = booking.clients as unknown as { first_name: string; whatsapp_number: string }
  const trainer = booking.profiles as unknown as { name: string }
  const dt = new Date(booking.date_time)
  const dateStr = format(dt, "EEEE, d MMMM")
  const timeStr = format(dt, "h:mm a")
  const now = new Date().toISOString()

  const serviceClient = createServiceClient()

  if (decision === "approved") {
    // Update booking status
    const { error } = await supabase
      .from("bookings")
      .update({ status: "upcoming" })
      .eq("id", bookingId)

    if (error) {
      return NextResponse.json({ error: "Failed to approve booking" }, { status: 500 })
    }

    // Update approval record
    await supabase
      .from("booking_approvals")
      .update({ status: "approved", decided_at: now })
      .eq("booking_id", bookingId)

    // Generate session token
    await serviceClient.from("session_tokens").insert({
      booking_id: bookingId,
      expires_at: dt.toISOString(),
    })

    // Get the session token for the link
    const { data: tokenRow } = await serviceClient
      .from("session_tokens")
      .select("token")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fitdesk.app"
    const sessionLink = tokenRow ? `${appUrl}/session/${tokenRow.token}` : ""

    await sendTemplateMessage({
      whatsappNumber: client.whatsapp_number,
      templateName: "booking_approved",
      parameters: [
        { name: "client_name", value: client.first_name },
        { name: "trainer_name", value: trainer.name },
        { name: "date", value: dateStr },
        { name: "time", value: timeStr },
        { name: "session_link", value: sessionLink },
      ],
    })

    return NextResponse.json({ success: true, decision: "approved" })
  } else {
    // Declined
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_by: "pt",
        cancelled_at: now,
        cancellation_reason: "Booking request declined",
      })
      .eq("id", bookingId)

    if (error) {
      return NextResponse.json({ error: "Failed to decline booking" }, { status: 500 })
    }

    await supabase
      .from("booking_approvals")
      .update({ status: "declined", decided_at: now })
      .eq("booking_id", bookingId)

    await sendTemplateMessage({
      whatsappNumber: client.whatsapp_number,
      templateName: "booking_declined",
      parameters: [
        { name: "client_name", value: client.first_name },
        { name: "trainer_name", value: trainer.name },
        { name: "date", value: dateStr },
        { name: "time", value: timeStr },
      ],
    })

    return NextResponse.json({ success: true, decision: "declined" })
  }
}
