/**
 * Helpers for the Stripe `invoice.payment_failed` webhook branch. Pure
 * functions so the webhook handler stays thin and testable.
 */

export interface PaymentFailedLogInput {
  customerId: string
  invoiceId: string
  subscriptionId?: string | null
  amountDueCents?: number | null
  currency?: string | null
  attemptCount?: number | null
  hostedInvoiceUrl?: string | null
}

export interface PaymentFailedLogPayload {
  event: "stripe.invoice.payment_failed"
  customerId: string
  invoiceId: string
  subscriptionId?: string
  amountDueCents?: number
  currency?: string
  attemptCount?: number
  hostedInvoiceUrl?: string
}

export function buildPaymentFailedLogPayload(
  input: PaymentFailedLogInput,
): PaymentFailedLogPayload {
  const payload: PaymentFailedLogPayload = {
    event: "stripe.invoice.payment_failed",
    customerId: input.customerId,
    invoiceId: input.invoiceId,
  }
  if (input.subscriptionId) payload.subscriptionId = input.subscriptionId
  if (typeof input.amountDueCents === "number") {
    payload.amountDueCents = input.amountDueCents
  }
  if (input.currency) payload.currency = input.currency
  if (typeof input.attemptCount === "number") {
    payload.attemptCount = input.attemptCount
  }
  if (input.hostedInvoiceUrl) payload.hostedInvoiceUrl = input.hostedInvoiceUrl
  return payload
}

export interface PaymentFailedWhatsappInput {
  ptName: string | null | undefined
  amountDueCents: number
  currency: string
  hostedInvoiceUrl: string
}

export interface WhatsappParam {
  name: string
  value: string
}

export function buildPaymentFailedWhatsappParams(
  input: PaymentFailedWhatsappInput,
): WhatsappParam[] {
  const name = (input.ptName && input.ptName.trim()) || "your trainer account"
  const amount = (input.amountDueCents / 100).toFixed(2)
  const currency = input.currency.toUpperCase()
  return [
    { name: "1", value: name },
    { name: "2", value: `${currency} ${amount}` },
    { name: "3", value: input.hostedInvoiceUrl },
  ]
}
