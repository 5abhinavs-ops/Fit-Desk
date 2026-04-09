import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { createServiceClient } from "@/lib/supabase/service"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import crypto from "crypto"

const VerifyOtpSchema = z.object({
  whatsapp_number: z.string().min(8),
  otp: z.string().length(6),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = VerifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const normalised = formatWhatsappNumber(parsed.data.whatsapp_number)
  const supabase = createServiceClient()

  // Fetch latest unused, unexpired OTP
  const { data: otpRow } = await supabase
    .from("client_otps")
    .select("*")
    .eq("whatsapp_number", normalised)
    .is("used_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!otpRow) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 401 }
    )
  }

  // Verify OTP
  const matches = await bcrypt.compare(parsed.data.otp, otpRow.otp_hash)
  if (!matches) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 401 }
    )
  }

  // Mark OTP as used
  await supabase
    .from("client_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otpRow.id)

  // Find client
  const { data: client } = await supabase
    .from("clients")
    .select("id, auth_user_id, first_name, last_name, trainer_id")
    .eq("whatsapp_number", normalised)
    .limit(1)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const syntheticEmail = `client-${client.id}@fitdesk.app`
  const randomPassword = crypto.randomUUID()

  let authUserId = client.auth_user_id

  if (!authUserId) {
    // Create Supabase auth user with synthetic email
    const { data: authData, error: createError } =
      await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          client_id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          role: "client",
        },
      })

    if (createError || !authData.user) {
      return NextResponse.json(
        { error: "Failed to create account. Try again." },
        { status: 500 }
      )
    }

    authUserId = authData.user.id

    // Link auth user to client row
    await supabase
      .from("clients")
      .update({ auth_user_id: authUserId })
      .eq("id", client.id)
  } else {
    // User exists — update password so we can sign in
    await supabase.auth.admin.updateUserById(authUserId, {
      password: randomPassword,
    })
  }

  // Sign in to get session tokens
  const { data: sessionData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: randomPassword,
    })

  if (signInError || !sessionData.session) {
    return NextResponse.json(
      { error: "Authentication failed. Try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    client: {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
    },
  })
}
