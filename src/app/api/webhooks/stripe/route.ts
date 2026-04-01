import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
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
      if (userId) {
        await supabase.from("profiles").update({
          subscription_plan: "pro",
          stripe_customer_id: session.customer as string,
        }).eq("id", userId)
      }
      break
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from("profiles").update({ subscription_plan: "free" })
        .eq("stripe_customer_id", sub.customer as string)
      break
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const plan = sub.status === "active" ? "pro" : "free"
      await supabase.from("profiles").update({ subscription_plan: plan })
        .eq("stripe_customer_id", sub.customer as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}
