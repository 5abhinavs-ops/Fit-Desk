"use client"

import { useState, useEffect } from "react"
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
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [requestingProof, setRequestingProof] = useState(false)

  useEffect(() => {
    if (open && payment.proof_url) {
      setProofLoading(true)
      fetch("/api/pt/payment-proof-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: payment.proof_url }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) setProofUrl(data.url)
        })
        .catch(() => {})
        .finally(() => setProofLoading(false))
    } else if (!open) {
      setProofUrl(null)
    }
  }, [open, payment.proof_url])

  async function handleRequestProof() {
    setRequestingProof(true)
    try {
      const res = await fetch("/api/pt/request-payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: payment.id }),
      })
      if (res.ok) {
        toast.success("Proof request sent to client via WhatsApp")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to send request")
      }
    } catch {
      toast.error("Failed to send request")
    } finally {
      setRequestingProof(false)
    }
  }

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

          {/* Proof section */}
          {payment.proof_url && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment proof</span>
                {payment.proof_uploaded_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.proof_uploaded_at), "d MMM, h:mm a")}
                  </span>
                )}
              </div>
              {proofLoading ? (
                <div className="flex items-center justify-center h-32 rounded-lg border">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : proofUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofUrl}
                  alt="Payment proof"
                  className="w-full max-h-[280px] object-contain rounded-lg border"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Could not load proof image.
                </p>
              )}
            </div>
          )}

          {/* Status-specific actions */}
          {payment.status === "received" ? (
            <p className="text-muted-foreground text-sm">
              Payment received on{" "}
              {payment.received_date
                ? format(new Date(payment.received_date + "T12:00:00"), "d MMM yyyy")
                : "—"}
            </p>
          ) : (
            <div className="space-y-2">
              {(payment.status as string) === "client_confirmed" && (
                <div className="rounded-lg border border-[rgba(0,198,212,0.3)] bg-[rgba(0,198,212,0.08)] p-3 space-y-1">
                  <p className="text-sm font-medium text-[#00C6D4]">
                    Client has confirmed payment
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Review the proof above and mark as received when confirmed.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleMarkReceived}
                disabled={markReceived.isPending}
              >
                {markReceived.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as received
              </Button>

              {(payment.status as string) !== "client_confirmed" && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSendReminder}
                    disabled={sendingReminder}
                  >
                    {sendingReminder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send WhatsApp reminder
                  </Button>

                  {!payment.proof_url && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleRequestProof}
                      disabled={requestingProof || !!payment.proof_requested_at}
                    >
                      {requestingProof && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {payment.proof_requested_at
                        ? `Proof requested ${format(new Date(payment.proof_requested_at), "d MMM")}`
                        : "Request payment proof"}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
