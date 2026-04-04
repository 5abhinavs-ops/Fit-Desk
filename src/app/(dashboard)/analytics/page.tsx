"use client"

import { useRouter } from "next/navigation"
import { useAnalytics } from "@/hooks/useAnalytics"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TrendingUp, AlertCircle, Users, Package, UserX } from "lucide-react"
import { format } from "date-fns"

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
  const { data, isLoading } = useAnalytics()
  const monthYear = format(new Date(), "MMMM yyyy")

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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">{monthYear}</p>
      </div>

      {/* Revenue card (prominent) */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary h-5 w-5" />
            <span className="text-muted-foreground text-sm">Revenue this month</span>
          </div>
          <p className="mt-2 text-4xl font-bold">
            {formatCurrency(data?.monthlyRevenue ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Sessions + No-show rate */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">Sessions completed</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{data?.sessionsCompleted ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className={`h-4 w-4 ${(data?.noShowRate ?? 0) > 10 ? "text-red-500" : "text-muted-foreground"}`} />
              <span className="text-muted-foreground text-xs">No-show rate</span>
            </div>
            <p className={`mt-2 text-3xl font-bold ${(data?.noShowRate ?? 0) > 10 ? "text-red-500" : ""}`}>
              {data?.noShowRate ?? 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding payments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-4 w-4 ${(data?.outstandingTotal ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            <span className="text-muted-foreground text-xs">Outstanding payments</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(data?.outstandingTotal ?? 0)}
          </p>
        </CardContent>
      </Card>

      {/* Package renewal rate */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Package className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-xs">Package renewal rate (90d)</span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {data?.packageRenewalRate !== null ? `${data?.packageRenewalRate}%` : "—"}
          </p>
        </CardContent>
      </Card>

      {/* Top clients */}
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
                  <p className="text-sm font-medium">{client.client_name}</p>
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
