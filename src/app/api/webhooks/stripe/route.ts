import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import { authoriseCheckoutCompletion } from "@/lib/stripe-webhook-verify"
import Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const customerId = typeof session.customer === "string" ? session.customer : null
      const sessionEmail =
        session.customer_details?.email ?? session.customer_email ?? null

      if (!userId) {
        console.error("[stripe-webhook] checkout.session.completed missing metadata.user_id", session.id)
        break
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, stripe_customer_id")
        .eq("id", userId)
        .maybeSingle()

      // Email lives on auth.users; fetch via admin API for the tamper-guard.
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      const profileEmail = authUser?.user?.email ?? null

      const authz = authoriseCheckoutCompletion({
        metadata: session.metadata ?? {},
        sessionCustomerId: customerId,
        sessionCustomerEmail: sessionEmail,
        profile: profile
          ? {
              id: profile.id,
              email: profileEmail,
              stripe_customer_id: profile.stripe_customer_id,
            }
          : null,
      })

      if (!authz.allowed) {
        console.error(
          `[stripe-webhook] rejected upgrade: ${authz.reason}`,
          { sessionId: session.id, userId, customerId },
        )
        break
      }

      await supabase.from("profiles").update({
        subscription_plan: "pro",
        stripe_customer_id: customerId,
      }).eq("id", userId)
      break
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const { error, count } = await supabase
        .from("profiles")
        .update({ subscription_plan: "free" }, { count: "exact" })
        .eq("stripe_customer_id", customerId)
      if (error || !count) {
        console.error(
          "[stripe-webhook] subscription.deleted: downgrade failed",
          { customerId, error: error?.message, rowsAffected: count },
        )
      }
      break
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const plan = sub.status === "active" ? "pro" : "free"
      const { error, count } = await supabase
        .from("profiles")
        .update({ subscription_plan: plan }, { count: "exact" })
        .eq("stripe_customer_id", customerId)
      if (error || !count) {
        console.error(
          "[stripe-webhook] subscription.updated: plan sync failed",
          { customerId, plan, error: error?.message, rowsAffected: count },
        )
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
