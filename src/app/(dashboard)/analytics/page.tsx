"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAnalytics } from "@/hooks/useAnalytics"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, AlertCircle, Users, Package, UserX, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { handleKeyboardActivation } from "@/lib/a11y"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AnalyticsPage() {
  const router = useRouter()

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    const sgtOffset = 8 * 60
    const sgt = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
    return sgt.toISOString().slice(0, 7)
  })

  const currentMonth = (() => {
    const now = new Date()
    const sgtOffset = 8 * 60
    const sgt = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
    return sgt.toISOString().slice(0, 7)
  })()

  function prevMonth() {
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function nextMonth() {
    if (selectedMonth >= currentMonth) return
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  function monthLabel(monthStr: string): string {
    const [y, m] = monthStr.split("-").map(Number)
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString("en-SG", { month: "long", year: "numeric" })
  }

  const { data, isLoading } = useAnalytics(selectedMonth)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-24" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // Find max revenue for bar chart scaling
  const maxRevenue = Math.max(...(data?.revenueHistory ?? []).map((p) => p.amount), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="flex items-center justify-center h-8 w-8 rounded-lg border hover:bg-accent transition-colors"
            aria-label="Previous month"
          >
            <Icon name={ChevronLeft} size="sm" />
          </button>
          <span className="text-body-lg font-semibold flex-1 text-center">
            {monthLabel(selectedMonth)}
          </span>
          <button
            onClick={nextMonth}
            disabled={selectedMonth >= currentMonth}
            className="flex items-center justify-center h-8 w-8 rounded-lg border hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            <Icon name={ChevronRight} size="sm" />
          </button>
        </div>
      </div>

      {/* Revenue card (prominent) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Icon name={TrendingUp} size="md" className="text-[#00E096]" />
            <span className="text-muted-foreground text-body-lg">Revenue this month</span>
          </div>
          <p className="mt-2 text-4xl font-semibold text-[#00E096] tabular">
            {formatCurrency(data?.monthlyRevenue ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Revenue history chart */}
      {data && data.revenueHistory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">Revenue trend (6 months)</p>
            <div className="flex items-end gap-1 h-24">
              {data.revenueHistory.map((point) => {
                const heightPct = maxRevenue > 0 ? (point.amount / maxRevenue) * 100 : 0
                const [selY, selM] = selectedMonth.split("-").map(Number)
                const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                const isSelectedMonth = point.month === MONTHS[selM - 1] && point.year === selY
                return (
                  <div key={`${point.year}-${point.month}`} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-micro text-muted-foreground">
                      {point.amount > 0 ? `$${Math.round(point.amount)}` : ""}
                    </span>
                    <div
                      className={`w-full rounded-t ${isSelectedMonth ? "bg-primary" : "bg-muted-foreground/20"}`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    <span className="text-micro text-muted-foreground">{point.month}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions + No-show rate */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Icon name={Users} size="sm" className="text-[#00C6D4]" />
              <span className="text-muted-foreground text-body-sm">Sessions this month</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular">{data?.sessionsCompleted ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Icon name={UserX} size="sm" className={(data?.noShowRate ?? 0) > 10 ? "text-[#FF4C7A]" : "text-muted-foreground"} />
              <span className="text-muted-foreground text-body-sm">No-show rate this month</span>
            </div>
            <p className={`mt-2 text-3xl font-semibold tabular ${(data?.noShowRate ?? 0) > 10 ? "text-[#FF4C7A]" : ""}`}>
              {data?.noShowRate ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Icon name={AlertCircle} size="sm" className="text-[#FFB347]" />
            <span className="text-muted-foreground text-body-sm">Total outstanding</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">All unpaid across all time</p>
          <p className="mt-2 text-2xl font-semibold text-[#FFB347] tabular">
            {formatCurrency(data?.outstandingTotal ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Package renewal rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Icon name={Package} size="sm" className="text-muted-foreground" />
            <span className="text-muted-foreground text-body-sm">Package renewal rate (90d)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular">
            {data?.packageRenewalRate !== null ? `${data?.packageRenewalRate}%` : "—"}
          </p>
        </CardContent>
      </Card>

      {/* Client revenue breakdown */}
      {data && data.clientRevenue.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Icon name={DollarSign} size="sm" className="text-[#00E096]" />
            Revenue by client
          </h2>
          {data.clientRevenue.map((client) => {
            const initials = client.client_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            const navigate = () => router.push(`/clients/${client.client_id}`)
            return (
              <div
                key={client.client_id}
                role="button"
                tabIndex={0}
                className="hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                onClick={navigate}
                onKeyDown={handleKeyboardActivation(navigate)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{client.client_name}</p>
                </div>
                <div className="text-right shrink-0">
                  {client.paid_this_month > 0 && (
                    <p className="text-sm font-semibold text-[#00E096]">
                      {formatCurrency(client.paid_this_month)}
                    </p>
                  )}
                  {client.outstanding > 0 && (
                    <p className="text-xs text-[#FF4C7A]">
                      {formatCurrency(client.outstanding)} owed
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Top clients by sessions */}
      {data && data.topClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Top clients this month</h2>
          {data.topClients.map((client) => {
            const initials = client.client_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            const navigate = () => router.push(`/clients/${client.client_id}`)
            return (
              <div
                key={client.client_id}
                role="button"
                tabIndex={0}
                className="hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                onClick={navigate}
                onKeyDown={handleKeyboardActivation(navigate)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-base font-semibold">{client.client_name}</p>
                </div>
                <span className="text-sm font-semibold">
                  {client.session_count} session{client.session_count !== 1 ? "s" : ""}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
