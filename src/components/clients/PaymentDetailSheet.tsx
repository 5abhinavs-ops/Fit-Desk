"use client"

import { useState, useEffect, useMemo } from "react"
import type { PaymentWithClient } from "@/hooks/usePayments"
import { useMarkPaymentReceived } from "@/hooks/usePayments"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { PaymentStatusCard } from "@/components/ui/payment-status-card"
import { format } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Package, Booking } from "@/types/database"

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

  const { data: pkg, isLoading: pkgLoading } = useQuery<Package | null>({
    queryKey: ["pt-payment-sheet-package", payment.client_id],
    enabled: open && !!payment.client_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("client_id", payment.client_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { data: bookings, isLoading: sessionsLoading } = useQuery<Booking[]>({
    queryKey: ["pt-payment-sheet-sessions", payment.client_id],
    enabled: open && !!payment.client_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", payment.client_id)
        .not("status", "in", "(cancelled,forfeited,no_show,no-show)")
        .order("date_time", { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  const { upcoming, recent } = useMemo(() => {
    const now = new Date()
    const all = bookings ?? []
    return {
      upcoming: all.filter((b) => new Date(b.date_time) > now).slice(0, 5),
      recent: all.filter((b) => new Date(b.date_time) <= now).slice(-3).reverse(),
    }
  }, [bookings])

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
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch proof URL:", err)
          }
        })
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
        <div className="space-y-4 pt-4 overflow-y-auto">
          {/* Payment status card — animates on pending → client_confirmed. */}
          <PaymentStatusCard
            status={payment.status}
            dueDate={payment.due_date}
            receivedDate={payment.received_date}
            proofUploadedAt={payment.proof_uploaded_at}
          />

          {/* Existing payment details */}
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
                <span className="text-sm font-semibold">Payment proof</span>
                {payment.proof_uploaded_at && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.proof_uploaded_at), "d MMM, h:mm a")}
                  </span>
                )}
              </div>
              {proofLoading ? (
                <div className="flex items-center justify-center h-32 rounded-lg border">
                  <Icon name={Loader2} size="md" className="animate-spin text-muted-foreground" />
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

          {/* Package status section */}
          {pkgLoading ? (
            <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
              <div className="h-4 w-24 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
              <div className="h-4 w-40 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            </div>
          ) : pkg ? (() => {
            const pct = (pkg.sessions_used / pkg.total_sessions) * 100
            const remaining = pkg.total_sessions - pkg.sessions_used
            const barColour =
              remaining > 2 ? "#00E096" :
              remaining >= 1 ? "#FFB347" :
              "#FF4C7A"
            return (
              <div className="space-y-2 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-semibold">{pkg.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sessions</span>
                  <span>{pkg.sessions_used} of {pkg.total_sessions} used</span>
                </div>
                <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%", borderRadius: 4,
                    background: barColour, transition: "width 0.3s ease",
                  }} />
                </div>
                <p className="text-micro" style={{ color: barColour }}>
                  {remaining} session{remaining !== 1 ? "s" : ""} remaining
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Period</span>
                  <span>
                    {format(new Date(pkg.start_date + "T12:00:00"), "d MMM yyyy")} →{" "}
                    {pkg.expiry_date
                      ? format(new Date(pkg.expiry_date + "T12:00:00"), "d MMM yyyy")
                      : "No expiry"}
                  </span>
                </div>
              </div>
            )
          })() : null}

          {/* Session schedule section */}
          {sessionsLoading ? (
            <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
              <div className="h-4 w-20 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
              <div className="h-4 w-48 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
              <span className="label-upper">Sessions</span>

              {upcoming.length > 0 && (
                <div className="space-y-2">
                  <p className="text-micro text-muted-foreground">Upcoming</p>
                  {upcoming.map((b) => {
                    const dt = new Date(b.date_time)
                    const badgeClass =
                      b.status === "confirmed" || b.status === "upcoming" ? "badge-cyan" :
                      b.status === "pending" || b.status === "pending_approval" ? "badge-warning" :
                      b.status === "reschedule_requested" ? "badge-warning" : "badge-neutral"
                    const badgeLabel =
                      b.status === "confirmed" || b.status === "upcoming" ? "Confirmed" :
                      b.status === "pending" || b.status === "pending_approval" ? "Pending" :
                      b.status === "reschedule_requested" ? "Reschedule" : b.status
                    return (
                      <div key={b.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-body-sm" style={{ color: "#fff" }}>
                            {format(dt, "EEE d MMM")}
                          </p>
                          <p className="text-micro text-muted-foreground">
                            {format(dt, "h:mm a")}
                          </p>
                        </div>
                        <span className={`${badgeClass} rounded-full px-2 py-0.5 text-xs font-semibold`}>
                          {badgeLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {recent.length > 0 && (
                <div className={`space-y-2 ${upcoming.length > 0 ? "mt-2" : ""}`}>
                  <p className="text-micro text-muted-foreground">Recent</p>
                  {recent.map((b) => {
                    const dt = new Date(b.date_time)
                    const badgeClass =
                      b.status === "completed" ? "badge-success" :
                      b.status === "no_show" || b.status === "no-show" ? "badge-danger" :
                      b.status === "forfeited" ? "badge-warning" : "badge-neutral"
                    const badgeLabel =
                      b.status === "completed" ? "Done" :
                      b.status === "no_show" || b.status === "no-show" ? "No-show" :
                      b.status === "forfeited" ? "Forfeited" : b.status
                    return (
                      <div key={b.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-body-sm" style={{ color: "#fff" }}>
                            {format(dt, "EEE d MMM")}
                          </p>
                          <p className="text-micro text-muted-foreground">
                            {format(dt, "h:mm a")}
                          </p>
                        </div>
                        <span className={`${badgeClass} rounded-full px-2 py-0.5 text-xs font-semibold`}>
                          {badgeLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {upcoming.length === 0 && recent.length === 0 && (
                <p className="text-body-sm text-muted-foreground">
                  No sessions found for this client.
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
              {payment.status === "client_confirmed" && (
                <div className="rounded-lg border border-[rgba(0,198,212,0.3)] bg-[rgba(0,198,212,0.08)] p-3 space-y-1">
                  <p className="text-sm font-semibold text-[#00C6D4]">
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
                {markReceived.isPending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
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
                    {sendingReminder && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
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
                        <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />
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
