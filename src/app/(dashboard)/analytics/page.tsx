"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAnalytics } from "@/hooks/useAnalytics"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, AlertCircle, Users, Package, UserX, DollarSign, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO, subMonths, addMonths } from "date-fns"

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
  const currentMonth = useMemo(() => format(new Date(), "yyyy-MM"), [])
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonth)
  const { data, isLoading } = useAnalytics(selectedMonth)

  const selectedDate = parseISO(selectedMonth + "-01")
  const monthYear = format(selectedDate, "MMMM yyyy")
  const isCurrentMonth = selectedMonth === currentMonth

  function goToPrevMonth() {
    setSelectedMonth(format(subMonths(selectedDate, 1), "yyyy-MM"))
  }

  function goToNextMonth() {
    if (!isCurrentMonth) {
      setSelectedMonth(format(addMonths(selectedDate, 1), "yyyy-MM"))
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="rounded-md p-1 transition-colors hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-muted-foreground text-[15px] min-w-[140px] text-center">
            {monthYear}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="rounded-md p-1 transition-colors hover:bg-accent disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Revenue card (prominent) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-[#00E096] h-5 w-5" />
            <span className="text-muted-foreground text-[15px]">Revenue this month</span>
          </div>
          <p className="mt-2 text-4xl font-bold text-[#00E096]">
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
                const isSelectedMonth = point.month === format(selectedDate, "MMM") && point.year === selectedDate.getFullYear()
                return (
                  <div key={`${point.year}-${point.month}`} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {point.amount > 0 ? `$${Math.round(point.amount)}` : ""}
                    </span>
                    <div
                      className={`w-full rounded-t ${isSelectedMonth ? "bg-primary" : "bg-muted-foreground/20"}`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">{point.month}</span>
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
              <Users className="text-[#00C6D4] h-4 w-4" />
              <span className="text-muted-foreground text-[13px]">Sessions completed</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data?.sessionsCompleted ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className={`h-4 w-4 ${(data?.noShowRate ?? 0) > 10 ? "text-[#FF4C7A]" : "text-muted-foreground"}`} />
              <span className="text-muted-foreground text-[13px]">No-show rate</span>
            </div>
            <p className={`mt-2 text-3xl font-bold ${(data?.noShowRate ?? 0) > 10 ? "text-[#FF4C7A]" : ""}`}>
              {data?.noShowRate ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#FFB347]" />
            <span className="text-muted-foreground text-[13px]">Outstanding payments</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-[#FFB347]">
            {formatCurrency(data?.outstandingTotal ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Package renewal rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-[13px]">Package renewal rate (90d)</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {data?.packageRenewalRate !== null ? `${data?.packageRenewalRate}%` : "—"}
          </p>
        </CardContent>
      </Card>

      {/* Client revenue breakdown */}
      {data && data.clientRevenue.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-[#00E096]" />
            Revenue by client
          </h2>
          {data.clientRevenue.map((client) => {
            const initials = client.client_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)

            return (
              <div
                key={client.client_id}
                className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                onClick={() => router.push(`/clients/${client.client_id}`)}
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

            return (
              <div
                key={client.client_id}
                className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                onClick={() => router.push(`/clients/${client.client_id}`)}
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
