"use client"

import { useState } from "react"
import { useClientPayments, type PaymentWithClient } from "@/hooks/usePayments"
import { PaymentDetailSheet } from "@/components/clients/PaymentDetailSheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

const statusColors: Record<string, string> = {
  received: "bg-[rgba(0,224,150,0.15)] text-[#00E096]",
  pending: "bg-[rgba(255,179,71,0.15)] text-[#FFB347]",
  overdue: "bg-[rgba(255,76,122,0.15)] text-[#FF4C7A]",
}

interface ClientPaymentsTabProps {
  clientId: string
}

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const { data: payments, isLoading } = useClientPayments(clientId)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithClient | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    )
  }

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "received")
    .reduce((sum, p) => sum + p.amount, 0)

  const outstanding = (payments ?? [])
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0)

  if (!payments || payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        No payment records for this client yet.
      </p>
    )
  }

  function formatDate(payment: PaymentWithClient): string {
    if (payment.status === "received" && payment.received_date) {
      return format(new Date(payment.received_date), "d MMM yyyy")
    }
    if (payment.due_date) {
      return format(new Date(payment.due_date), "d MMM yyyy")
    }
    return "No date"
  }

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex gap-2">
        <span className="rounded-full bg-[rgba(0,224,150,0.15)] text-[#00E096] px-3 py-1 text-xs font-medium">
          Total paid: ${totalPaid.toFixed(0)}
        </span>
        <span className="rounded-full bg-[rgba(255,179,71,0.15)] text-[#FFB347] px-3 py-1 text-xs font-medium">
          Outstanding: ${outstanding.toFixed(0)}
        </span>
      </div>

      {/* Payment list */}
      <div className="space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors ${
              payment.status === "overdue" ? "border-l-4 border-l-red-500" : ""
            }`}
            onClick={() => setSelectedPayment(payment)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{formatDate(payment)}</p>
              <Badge variant="outline" className="text-xs mt-0.5">{payment.method}</Badge>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">${payment.amount}</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[payment.status]}`}>
                {payment.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedPayment && (
        <PaymentDetailSheet
          payment={selectedPayment}
          open={!!selectedPayment}
          onOpenChange={(open) => { if (!open) setSelectedPayment(null) }}
        />
      )}
    </div>
  )
}
