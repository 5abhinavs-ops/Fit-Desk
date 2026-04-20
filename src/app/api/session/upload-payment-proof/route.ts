import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { isAllowedImageBuffer } from "@/lib/file-validation"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

// Two-tier rate limit:
//  - Pre-validation: IP-based broad limit so fake tokens can't fan out buckets.
//  - Post-validation: token-id-based fine limit to stop a valid token being
//    abused. Attacker-controlled `token` string is never used as the RL key.
const IP_WINDOW_MS = 60_000
const IP_MAX_REQUESTS = 20
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60_000
const UPLOAD_RATE_LIMIT_MAX = 3

export async function POST(request: Request) {
  const clientIp = getClientIp(request)
  const ipRl = checkRateLimit(
    `upload-payment-proof-ip:${clientIp}`,
    IP_MAX_REQUESTS,
    IP_WINDOW_MS,
  )
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads from this network." },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSeconds) },
      },
    )
  }

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

  // Validate booking_id is a UUID
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(bookingId)) {
    return NextResponse.json({ error: "Invalid booking_id" }, { status: 400 })
  }

  // Validate file type and size
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  const MAX_BYTES = 5 * 1024 * 1024
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Upload an image." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 })
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

  // Per-token fine rate limit — only applied after token is validated so
  // attackers cannot fan out across fabricated token strings.
  const tokenRl = checkRateLimit(
    `upload-payment-proof-token:${sessionToken.id}`,
    UPLOAD_RATE_LIMIT_MAX,
    UPLOAD_RATE_LIMIT_WINDOW_MS,
  )
  if (!tokenRl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(tokenRl.retryAfterSeconds) },
      },
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

  // Find pending/overdue payment for this booking (may not exist for from_package)
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("booking_id", bookingId)
    .in("status", ["pending", "overdue"])
    .limit(1)
    .maybeSingle()

  if (paymentError) {
    return NextResponse.json({ error: "Failed to look up payment" }, { status: 500 })
  }

  // Upload file to storage
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Validate actual file contents — browser-supplied file.type is spoofable
  if (!isAllowedImageBuffer(buffer)) {
    return NextResponse.json(
      { error: "Invalid file type. Upload a JPEG, PNG, WEBP, or GIF image." },
      { status: 400 }
    )
  }

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
