"use client"

import { useState, useEffect } from "react"
import type { PaymentWithClient } from "@/hooks/usePayments"
import { useMarkPaymentReceived } from "@/hooks/usePayments"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Clock, AlertCircle, CheckCircle } from "lucide-react"
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
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("client_id", payment.client_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const { data: bookings, isLoading: sessionsLoading } = useQuery<Booking[]>({
    queryKey: ["pt-payment-sheet-sessions", payment.client_id],
    enabled: open && !!payment.client_id,
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", payment.client_id)
        .not("status", "in", "(cancelled,forfeited,no_show,no-show)")
        .order("date_time", { ascending: true })
      return data ?? []
    },
  })

  const now = new Date()
  const upcoming = (bookings ?? [])
    .filter((b) => new Date(b.date_time) > now)
    .slice(0, 5)
  const recent = (bookings ?? [])
    .filter((b) => new Date(b.date_time) <= now)
    .slice(-3)
    .reverse()

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
          {/* Payment status card */}
          {payment.status === "pending" && (
            <div style={{
              borderRadius: 10, padding: "10px 12px", display: "flex",
              alignItems: "flex-start", gap: 10,
              background: "rgba(255,179,71,0.08)",
              border: "1px solid rgba(255,179,71,0.25)",
            }}>
              <Clock size={14} style={{ color: "#FFB347", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#FFB347" }}>
                  Payment pending
                </p>
                <p style={{ fontSize: 12, color: "#FFB347", opacity: 0.75, marginTop: 2 }}>
                  {payment.due_date
                    ? `Due ${format(new Date(payment.due_date + "T12:00:00"), "d MMM yyyy")}`
                    : "No due date set"}
                </p>
              </div>
            </div>
          )}
          {payment.status === "overdue" && (() => {
            const daysOverdue = payment.due_date
              ? Math.floor((Date.now() - new Date(payment.due_date + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24))
              : 0
            return (
              <div style={{
                borderRadius: 10, padding: "10px 12px", display: "flex",
                alignItems: "flex-start", gap: 10,
                background: "rgba(255,76,122,0.08)",
                border: "1px solid rgba(255,76,122,0.25)",
              }}>
                <AlertCircle size={14} style={{ color: "#FF4C7A", marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#FF4C7A" }}>
                    {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                  </p>
                  {payment.due_date && (
                    <p style={{ fontSize: 12, color: "#FF4C7A", opacity: 0.75, marginTop: 2 }}>
                      Was due {format(new Date(payment.due_date + "T12:00:00"), "d MMM yyyy")}
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
          {payment.status === "client_confirmed" && (
            <div style={{
              borderRadius: 10, padding: "10px 12px", display: "flex",
              alignItems: "flex-start", gap: 10,
              background: "rgba(0,198,212,0.08)",
              border: "1px solid rgba(0,198,212,0.25)",
            }}>
              <CheckCircle size={14} style={{ color: "#00C6D4", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#00C6D4" }}>
                  Client confirmed payment
                </p>
                <p style={{ fontSize: 12, color: "#00C6D4", opacity: 0.75, marginTop: 2 }}>
                  {payment.proof_uploaded_at
                    ? `Proof uploaded ${format(new Date(payment.proof_uploaded_at), "d MMM, h:mm a")}`
                    : "Awaiting your review"}
                </p>
              </div>
            </div>
          )}
          {payment.status === "received" && (
            <div style={{
              borderRadius: 10, padding: "10px 12px", display: "flex",
              alignItems: "flex-start", gap: 10,
              background: "rgba(0,224,150,0.08)",
              border: "1px solid rgba(0,224,150,0.25)",
            }}>
              <CheckCircle size={14} style={{ color: "#00E096", marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#00E096" }}>
                  Payment received
                </p>
                {payment.received_date && (
                  <p style={{ fontSize: 12, color: "#00E096", opacity: 0.75, marginTop: 2 }}>
                    {format(new Date(payment.received_date + "T12:00:00"), "d MMM yyyy")}
                  </p>
                )}
              </div>
            </div>
          )}

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
                  <span className="font-medium">{pkg.name}</span>
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
                <p style={{ fontSize: 12, color: barColour }}>
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
                  <p style={{ fontSize: 12 }} className="text-muted-foreground">Upcoming</p>
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
                          <p style={{ fontSize: 13, color: "#fff" }}>
                            {format(dt, "EEE d MMM")}
                          </p>
                          <p style={{ fontSize: 12 }} className="text-muted-foreground">
                            {format(dt, "h:mm a")}
                          </p>
                        </div>
                        <span className={`${badgeClass} rounded-full px-2 py-0.5 text-xs font-medium`}>
                          {badgeLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {recent.length > 0 && (
                <div className={`space-y-2 ${upcoming.length > 0 ? "mt-2" : ""}`}>
                  <p style={{ fontSize: 12 }} className="text-muted-foreground">Recent</p>
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
                          <p style={{ fontSize: 13, color: "#fff" }}>
                            {format(dt, "EEE d MMM")}
                          </p>
                          <p style={{ fontSize: 12 }} className="text-muted-foreground">
                            {format(dt, "h:mm a")}
                          </p>
                        </div>
                        <span className={`${badgeClass} rounded-full px-2 py-0.5 text-xs font-medium`}>
                          {badgeLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {upcoming.length === 0 && recent.length === 0 && (
                <p className="text-muted-foreground" style={{ fontSize: 13 }}>
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
