"use client"

import type { Booking } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, DollarSign } from "lucide-react"
import { format } from "date-fns"

const paymentStatusStyles: Record<string, { label: string; className: string }> = {
  unpaid: { label: "Unpaid", className: "bg-[rgba(255,76,122,0.15)] text-[#FF4C7A]" },
  client_confirmed: { label: "Client confirmed", className: "bg-[rgba(255,179,71,0.15)] text-[#FFB347]" },
  paid: { label: "Paid", className: "bg-[rgba(0,224,150,0.15)] text-[#00E096]" },
  waived: { label: "Waived", className: "bg-[#1A3349] text-white" },
}

interface PaymentSectionProps {
  booking: Booking
  paymentAmount: string
  onAmountChange: (value: string) => void
  paymentPending: boolean
  onPaymentAction: (action: "mark_paid" | "waive") => void
}

export function PaymentSection({
  booking,
  paymentAmount,
  onAmountChange,
  paymentPending,
  onPaymentAction,
}: PaymentSectionProps) {
  const status = paymentStatusStyles[booking.payment_status] ?? paymentStatusStyles.unpaid
  const isFinal = booking.payment_status === "paid" || booking.payment_status === "waived"

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Payment</span>
        </div>
        <Badge className={status.className}>{status.label}</Badge>
      </div>

      {booking.client_paid_at && booking.payment_status === "client_confirmed" && (
        <p className="text-xs text-amber-600">
          Client confirmed payment on {format(new Date(booking.client_paid_at), "d MMM, h:mm a")}
        </p>
      )}

      {!isFinal && (
        <>
          <div className="space-y-1">
            <Label htmlFor="payment-amount" className="text-xs">Amount ($)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              disabled={paymentPending}
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onPaymentAction("mark_paid")}
              disabled={paymentPending}
            >
              {paymentPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark as paid"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onPaymentAction("waive")}
              disabled={paymentPending}
            >
              Waive
            </Button>
          </div>
        </>
      )}

      {isFinal && booking.pt_confirmed_at && (
        <p className="text-xs text-muted-foreground">
          Confirmed on {format(new Date(booking.pt_confirmed_at), "d MMM, h:mm a")}
          {booking.payment_amount ? ` — $${booking.payment_amount}` : ""}
        </p>
      )}
    </div>
  )
}
