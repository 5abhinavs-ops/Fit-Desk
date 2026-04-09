import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/twilio"

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const token = formData.get("token") as string | null
  const bookingId = formData.get("booking_id") as string | null

  if (!file || !token || !bookingId) {
    return NextResponse.json(
      { error: "Missing file, token, or booking_id" },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // Validate session token
  const { data: sessionToken } = await supabase
    .from("session_tokens")
    .select("id, booking_id")
    .eq("token", token)
    .eq("booking_id", bookingId)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString())
    .single()

  if (!sessionToken) {
    return NextResponse.json(
      { error: "Invalid or expired session link" },
      { status: 403 }
    )
  }

  // Fetch booking + linked payment
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, trainer_id, client_id")
    .eq("id", bookingId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // Find pending/overdue payment for this booking
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "overdue"])
    .limit(1)
    .single()

  // Upload file to storage
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const storagePath = `${booking.trainer_id}/${booking.client_id}/${payment?.id ?? bookingId}/${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
    })

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload proof" },
      { status: 500 }
    )
  }

  // Update payment if exists
  if (payment) {
    await supabase
      .from("payments")
      .update({
        proof_url: storagePath,
        proof_uploaded_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
  }

  // Update booking payment status
  await supabase
    .from("bookings")
    .update({ payment_status: "client_confirmed" })
    .eq("id", bookingId)

  // Notify PT via WhatsApp
  const { data: trainer } = await supabase
    .from("profiles")
    .select("whatsapp_number")
    .eq("id", booking.trainer_id)
    .single()

  if (trainer?.whatsapp_number) {
    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name")
      .eq("id", booking.client_id)
      .single()

    const clientName = client
      ? `${client.first_name} ${client.last_name}`.trim()
      : "Your client"

    await sendTemplateMessage({
      whatsappNumber: trainer.whatsapp_number,
      templateName: "client_uploaded_proof",
      parameters: [
        { name: "1", value: clientName },
        { name: "2", value: payment ? `$${payment.amount}` : "payment" },
      ],
    })
  }

  return NextResponse.json({ success: true })
}
