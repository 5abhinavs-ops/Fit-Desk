"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PaymentProofSheet } from "@/components/client/payment-proof-sheet"
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import type { Payment } from "@/types/database"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ClientPaymentsPage() {
  const { data: identity, isLoading: identityLoading } = useClientIdentity()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const clientId = identity?.id

  const [proofTarget, setProofTarget] = useState<Payment | null>(null)

  const { data: payments, isLoading } = useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
      return (data ?? []) as Payment[]
    },
    enabled: !!clientId,
  })

  if (identityLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  const outstanding = (payments ?? []).filter((p) =>
    ["pending", "overdue"].includes(p.status)
  )
  const received = (payments ?? []).filter((p) => p.status === "received")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-[#FFB347]" />
        Payments
      </h1>

      {/* Outstanding */}
      {outstanding.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Outstanding
          </h2>
          {outstanding.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-[#FFB347]">
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {payment.status === "overdue" ? (
                        <span className="badge-danger text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Overdue
                        </span>
                      ) : (
                        <span className="badge-warning text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                      {payment.due_date && (
                        <span className="text-[13px] text-muted-foreground">
                          Due{" "}
                          {format(new Date(payment.due_date), "d MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProofTarget(payment)}
                  >
                    I&apos;ve paid
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Received */}
      {received.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Received
          </h2>
          {received.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-success text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Received
                      </span>
                      {payment.received_date && (
                        <span className="text-[13px] text-muted-foreground">
                          {format(
                            new Date(payment.received_date),
                            "d MMM yyyy"
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    {payment.method}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(payments ?? []).length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No payments yet
        </p>
      )}

      {/* Proof upload sheet */}
      {proofTarget && identity && (
        <PaymentProofSheet
          paymentId={proofTarget.id}
          trainerId={proofTarget.trainer_id}
          clientId={identity.id}
          clientName={`${identity.first_name} ${identity.last_name}`}
          amount={proofTarget.amount}
          open={!!proofTarget}
          onOpenChange={(open) => {
            if (!open) setProofTarget(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["client-payments"],
            })
            queryClient.invalidateQueries({
              queryKey: ["client-outstanding-payment"],
            })
          }}
        />
      )}
    </div>
  )
}
