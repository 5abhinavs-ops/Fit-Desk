import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { buildMagicLinkSms, isValidE164, sendSms } from "@/lib/twilio-sms"

const SendMagicLinkSchema = z.object({
  phone: z.string().min(8).max(32),
})

/**
 * Uniform response for all outcomes past the rate-limit check.
 * Prevents user enumeration via status code or response body diffs.
 */
const UNIFORM_SUCCESS = NextResponse.json(
  { success: true, message: "If that number has an account, an SMS is on the way." },
  { status: 200 },
)

async function uniformDelay<T>(promise: Promise<T>, minMs: number): Promise<T> {
  const floor = new Promise((resolve) => setTimeout(resolve, minMs))
  const [result] = await Promise.all([promise, floor])
  return result
}

export async function POST(request: Request) {
  // Same-origin origin check — closes off cross-origin SMS-spam CSRF vector.
  // Allow absent Origin (server-to-server, tests) but reject mismatches.
  const origin = request.headers.get("origin")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (origin && appUrl && origin !== appUrl) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = SendMagicLinkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const normalised = formatWhatsappNumber(parsed.data.phone)
  if (!isValidE164(normalised)) {
    return NextResponse.json(
      { error: "Enter a valid phone number including country code." },
      { status: 400 },
    )
  }

  // Per-phone rate limit: 1 per 60s.
  const phoneRate = checkRateLimit(`magic-link:phone:${normalised}`, 1, 60_000)
  if (!phoneRate.allowed) {
    return NextResponse.json(
      {
        error: `Please wait ${phoneRate.retryAfterSeconds}s before requesting another link.`,
      },
      { status: 429 },
    )
  }

  // Per-IP rate limit: 5 per 10min — blocks scan-across-phones abuse.
  const ip = getClientIp(request)
  const ipRate = checkRateLimit(`magic-link:ip:${ip}`, 5, 10 * 60_000)
  if (!ipRate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    )
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: "Server misconfigured. Contact support." },
      { status: 500 },
    )
  }

  // Perform the rest of the work behind a uniform ~800ms response floor so
  // registered vs unregistered phones are indistinguishable by timing.
  await uniformDelay(processMagicLink(normalised, appUrl), 800)

  return UNIFORM_SUCCESS
}

async function processMagicLink(phone: string, appUrl: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, auth_user_id, first_name, last_name, trainer_id")
    .eq("whatsapp_number", phone)
    .limit(1)
    .maybeSingle()

  // Unregistered phone — return uniform success without side effects.
  if (!client) return

  const syntheticEmail = `client-${client.id}@fitdesk.app`
  let authUserId = client.auth_user_id

  if (!authUserId) {
    const { data: authData, error: createError } =
      await supabase.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
          client_id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          role: "client",
        },
      })

    if (createError || !authData.user) return

    authUserId = authData.user.id

    const { error: linkError } = await supabase
      .from("clients")
      .update({ auth_user_id: authUserId })
      .eq("id", client.id)

    // If linking fails we abort rather than proceeding — otherwise the next
    // login would race and create a duplicate auth user.
    if (linkError) return
  }

  const { data: linkData, error: genError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/client`,
      },
    })

  if (genError || !linkData.properties?.action_link) return

  // Fire-and-forget send: we already returned uniform success to the caller.
  // Errors are swallowed here intentionally (delivery failures are surfaced
  // via Twilio dashboards / logs, not via the HTTP response).
  await sendSms({
    to: phone,
    body: buildMagicLinkSms(linkData.properties.action_link),
  })
}
