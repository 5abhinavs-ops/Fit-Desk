"use client"

import { useState, useMemo } from "react"
import { usePayments, type PaymentWithClient } from "@/hooks/usePayments"
import { usePaymentConfidence } from "@/hooks/usePaymentConfidence"
import { PaymentDetailSheet } from "@/components/clients/PaymentDetailSheet"
import { LogPaymentSheet } from "@/components/clients/LogPaymentSheet"
import { RecentAutomations } from "@/components/payments/recent-automations"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Clock, Plus } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { handleKeyboardActivation } from "@/lib/a11y"
import { format } from "date-fns"

const methodLabels: Record<string, string> = {
  PayNow: "PayNow",
  cash: "Cash",
  bank_transfer: "Bank",
  card: "Card",
  other: "Other",
}

const statusStyles: Record<string, string> = {
  overdue: "badge-danger",
  pending: "badge-warning",
  received: "badge-success",
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function PaymentsPage() {
  const { data: payments, isLoading } = usePayments()
  const { data: confidence, isLoading: confidenceLoading } = usePaymentConfidence()
  const [tab, setTab] = useState("all")
  const [detailPayment, setDetailPayment] = useState<PaymentWithClient | null>(null)
  const [logOpen, setLogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!payments) return []
    const list = tab === "all" ? payments : payments.filter((p) => p.status === tab)
    return [...list].sort((a, b) => {
      const order: Record<string, number> = { overdue: 0, pending: 1, received: 2 }
      const diff = (order[a.status] ?? 1) - (order[b.status] ?? 1)
      if (diff !== 0) return diff
      if (a.status === "received") {
        return (b.received_date ?? "").localeCompare(a.received_date ?? "")
      }
      return (a.due_date ?? "").localeCompare(b.due_date ?? "")
    })
  }, [payments, tab])

  const tabCounts = useMemo(() => {
    if (!payments) return { all: 0, overdue: 0, pending: 0, received: 0 }
    return {
      all: payments.length,
      overdue: payments.filter((p) => p.status === "overdue").length,
      pending: payments.filter((p) => p.status === "pending").length,
      received: payments.filter((p) => p.status === "received").length,
    }
  }, [payments])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payments</h1>

      {/* Summary */}
      {confidenceLoading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Confirmed</p>
                    <p className="mt-1 text-2xl font-semibold tabular text-[#00e096]">
                      {formatCurrency(confidence?.confirmed ?? 0)}
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-[#00e096]" aria-hidden />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Client confirmed</p>
                    <p className="mt-1 text-2xl font-semibold tabular text-amber-500">
                      {formatCurrency(confidence?.clientConfirmed ?? 0)}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-500" aria-hidden />
                </div>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Due</p>
                    <p className="mt-1 text-2xl font-semibold tabular text-muted-foreground">
                      {formatCurrency(confidence?.due ?? 0)}
                    </p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1">Overdue ({tabCounts.overdue})</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">Pending ({tabCounts.pending})</TabsTrigger>
          <TabsTrigger value="received" className="flex-1">Received ({tabCounts.received})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Payment list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-body-lg">No payments found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const clientName = p.clients
              ? `${p.clients.first_name} ${p.clients.last_name}`
              : "Unknown"
            const initials = p.clients
              ? `${p.clients.first_name[0] ?? ""}${p.clients.last_name[0] ?? ""}`.toUpperCase()
              : "?"

            const openDetail = () => setDetailPayment(p)
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className={`hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  p.status === "overdue" ? "border-l-4 border-l-[#FF4C7A]" : ""
                }`}
                onClick={openDetail}
                onKeyDown={handleKeyboardActivation(openDetail)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{clientName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-micro">
                      {methodLabels[p.method] ?? p.method}
                    </Badge>
                    <span className="text-muted-foreground text-body-sm truncate">
                      {p.status === "received" && p.received_date
                        ? `Received ${format(new Date(p.received_date + "T12:00:00"), "d MMM")}`
                        : p.due_date
                          ? `Due ${format(new Date(p.due_date + "T12:00:00"), "d MMM")}`
                          : ""}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular">${p.amount}</p>
                  <Badge variant="secondary" className={`text-micro ${statusStyles[p.status]}`}>
                    {p.status}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Phase L — Recent automations (collapsible, native <details>) */}
      <RecentAutomations />

      {/* FAB */}
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full fab-glow"
        onClick={() => setLogOpen(true)}
      >
        <Icon name={Plus} size="lg" />
      </Button>

      {detailPayment && (
        <PaymentDetailSheet
          payment={detailPayment}
          open={!!detailPayment}
          onOpenChange={(o) => { if (!o) setDetailPayment(null) }}
        />
      )}

      <LogPaymentSheet open={logOpen} onOpenChange={setLogOpen} />
    </div>
  )
}
