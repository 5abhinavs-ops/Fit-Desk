import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import { authoriseCheckoutCompletion } from "@/lib/stripe-webhook-verify"
import {
  buildPaymentFailedLogPayload,
  buildPaymentFailedWhatsappParams,
} from "@/lib/stripe-payment-failed"
import { sendTemplateMessage } from "@/lib/whatsapp"
import Stripe from "stripe"

const PAYMENT_FAILED_TEMPLATE = "pt_payment_failed"

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
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null
      if (!customerId) break

      const payload = buildPaymentFailedLogPayload({
        customerId,
        invoiceId: invoice.id ?? "",
        subscriptionId:
          typeof (invoice as Stripe.Invoice & { subscription?: string | null }).subscription === "string"
            ? ((invoice as Stripe.Invoice & { subscription?: string | null }).subscription as string)
            : null,
        amountDueCents: invoice.amount_due,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })

      // Strip hosted_invoice_url before forwarding to Sentry — that URL is a
      // one-click payable invoice link and must not land in telemetry.
      const sentryExtra: Record<string, unknown> = { ...payload }
      delete sentryExtra.hostedInvoiceUrl
      Sentry.captureMessage("stripe.invoice.payment_failed", {
        level: "warning",
        extra: sentryExtra,
      })

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, whatsapp_number")
        .eq("stripe_customer_id", customerId)
        .maybeSingle()

      if (profile?.whatsapp_number && invoice.hosted_invoice_url) {
        const params = buildPaymentFailedWhatsappParams({
          ptName: profile.name,
          amountDueCents: invoice.amount_due,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
        })
        const result = await sendTemplateMessage({
          whatsappNumber: profile.whatsapp_number,
          templateName: PAYMENT_FAILED_TEMPLATE,
          parameters: params,
          trainerId: profile.id,
        })
        if (!result.success) {
          Sentry.captureMessage("stripe.payment_failed.whatsapp_send_failed", {
            level: "warning",
            extra: { customerId, reason: result.reason, error: result.error },
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
