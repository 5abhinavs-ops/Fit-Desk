import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { createServiceClient } from "@/lib/supabase/service"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import { sendTemplateMessage } from "@/lib/whatsapp"

const SendOtpSchema = z.object({
  whatsapp_number: z.string().min(8),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = SendOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const normalised = formatWhatsappNumber(parsed.data.whatsapp_number)
  const supabase = createServiceClient()

  // Rate limit: max 3 OTPs per number per 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("client_otps")
    .select("id", { count: "exact", head: true })
    .eq("whatsapp_number", normalised)
    .gte("created_at", tenMinAgo)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 10 minutes." },
      { status: 429 }
    )
  }

  // Verify client exists
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("whatsapp_number", normalised)
    .limit(1)
    .single()

  if (!client) {
    return NextResponse.json(
      { error: "No account found. Ask your PT to add you as a client." },
      { status: 404 }
    )
  }

  // Generate and hash OTP
  const otp = String(crypto.randomInt(100000, 1000000))
  const otpHash = await bcrypt.hash(otp, 10)

  // Store OTP
  const { error: insertError } = await supabase.from("client_otps").insert({
    whatsapp_number: normalised,
    otp_hash: otpHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to generate code. Try again." },
      { status: 500 }
    )
  }

  // Send OTP via WhatsApp
  await sendTemplateMessage({
    whatsappNumber: normalised,
    templateName: "fitdesk_client_otp",
    parameters: [{ name: "1", value: otp }],
  })

  return NextResponse.json({ success: true })
}
