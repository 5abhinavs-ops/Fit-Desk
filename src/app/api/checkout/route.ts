import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { checkCsrf } from "@/lib/csrf"

export async function POST(request: Request) {
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { interval?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { interval } = body
  const priceId = interval === "year"
    ? process.env.STRIPE_PRO_PRICE_YEARLY_ID!
    : process.env.STRIPE_PRO_PRICE_MONTHLY_ID!

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
      customer_email: user.email,
      metadata: { user_id: user.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 500 }
    )
  }
}
