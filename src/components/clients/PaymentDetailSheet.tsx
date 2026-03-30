"use client"

import { useState } from "react"
import type { PaymentWithClient } from "@/hooks/usePayments"
import { useMarkPaymentReceived } from "@/hooks/usePayments"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

interface PaymentDetailSheetProps {
  payment: PaymentWithClient
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PaymentDetailSheet({ payment, open, onOpenChange }: PaymentDetailSheetProps) {
  const markReceived = useMarkPaymentReceived()
  const [sendingReminder, setSendingReminder] = useState(false)

  const clientName = payment.clients
    ? `${payment.clients.first_name} ${payment.clients.last_name}`
    : "Unknown"

  async function handleSendReminder() {
    setSendingReminder(true)
    try {
      const res = await fetch("/api/reminders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      })
      if (res.ok) {
        toast.success("Reminder sent via WhatsApp")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to send reminder")
      }
    } catch {
      toast.error("Failed to send reminder")
    } finally {
      setSendingReminder(false)
    }
  }

  function handleMarkReceived() {
    markReceived.mutate(payment.id, {
      onSuccess: () => {
        toast.success("Payment marked as received")
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed")
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{clientName}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">${payment.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span>{payment.method}</span>
            </div>
            {payment.reference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span>{payment.reference}</span>
              </div>
            )}
            {payment.due_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span>{format(new Date(payment.due_date + "T12:00:00"), "d MMM yyyy")}</span>
              </div>
            )}
            {payment.notes && (
              <div>
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1">{payment.notes}</p>
              </div>
            )}
          </div>

          {payment.status === "received" ? (
            <p className="text-muted-foreground text-sm">
              Payment received on{" "}
              {payment.received_date
                ? format(new Date(payment.received_date + "T12:00:00"), "d MMM yyyy")
                : "—"}
            </p>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handleMarkReceived}
                disabled={markReceived.isPending}
              >
                {markReceived.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as received
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSendReminder}
                disabled={sendingReminder}
              >
                {sendingReminder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send WhatsApp reminder
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
