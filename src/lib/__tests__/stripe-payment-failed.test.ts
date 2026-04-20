import { describe, it, expect } from "vitest"
import {
  buildPaymentFailedLogPayload,
  buildPaymentFailedWhatsappParams,
} from "../stripe-payment-failed"

describe("buildPaymentFailedLogPayload", () => {
  it("packages the key fields into a structured log object", () => {
    const payload = buildPaymentFailedLogPayload({
      customerId: "cus_123",
      invoiceId: "in_456",
      subscriptionId: "sub_789",
      amountDueCents: 1900,
      currency: "usd",
      attemptCount: 1,
      hostedInvoiceUrl: "https://invoice.stripe.com/i/xxx",
    })

    expect(payload).toEqual({
      event: "stripe.invoice.payment_failed",
      customerId: "cus_123",
      invoiceId: "in_456",
      subscriptionId: "sub_789",
      amountDueCents: 1900,
      currency: "usd",
      attemptCount: 1,
      hostedInvoiceUrl: "https://invoice.stripe.com/i/xxx",
    })
  })

  it("drops optional fields when not provided", () => {
    const payload = buildPaymentFailedLogPayload({
      customerId: "cus_123",
      invoiceId: "in_456",
    })

    expect(payload).toEqual({
      event: "stripe.invoice.payment_failed",
      customerId: "cus_123",
      invoiceId: "in_456",
    })
  })
})

describe("buildPaymentFailedWhatsappParams", () => {
  it("formats amount and currency for display in the template", () => {
    const params = buildPaymentFailedWhatsappParams({
      ptName: "Alex",
      amountDueCents: 1900,
      currency: "usd",
      hostedInvoiceUrl: "https://invoice.stripe.com/i/xxx",
    })

    expect(params).toEqual([
      { name: "1", value: "Alex" },
      { name: "2", value: "USD 19.00" },
      { name: "3", value: "https://invoice.stripe.com/i/xxx" },
    ])
  })

  it("rounds to 2 decimals for cents conversion", () => {
    const params = buildPaymentFailedWhatsappParams({
      ptName: "Alex",
      amountDueCents: 19050,
      currency: "sgd",
      hostedInvoiceUrl: "https://x",
    })
    expect(params[1]).toEqual({ name: "2", value: "SGD 190.50" })
  })

  it("falls back to 'your trainer account' when ptName missing", () => {
    const params = buildPaymentFailedWhatsappParams({
      ptName: null,
      amountDueCents: 1000,
      currency: "usd",
      hostedInvoiceUrl: "https://x",
    })
    expect(params[0]).toEqual({ name: "1", value: "your trainer account" })
  })
})
