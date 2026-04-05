"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarDays, DollarSign, AlertTriangle, TrendingUp, Dumbbell, AlertCircle, UserCheck, UserMinus, Eye, X } from "lucide-react"
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import { DEMO_DASHBOARD_DATA } from "@/lib/demo-data"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { format } from "date-fns"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function DashboardPage() {
  const router = useRouter()
  const { data, isLoading, isError } = useDashboard()
  const [trainerName, setTrainerName] = useState("")
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setTrainerName((user.user_metadata?.name as string) || "")
      }
    })
  }, [])

  const today = format(new Date(), "EEEE, d MMMM yyyy")

  const hasRealData = !isLoading && data && (
    data.todayBookingsCount > 0 ||
    data.monthlyRevenue > 0 ||
    data.lowSessionClients.length > 0 ||
    data.lapsedClients.length > 0
  )
  const showDemoPrompt = !isLoading && !isDemoMode && !hasRealData && !isError
  const displayData = isDemoMode ? DEMO_DASHBOARD_DATA : data

  function handleDemoNav() {
    toast("This is demo data — add a real client to get started")
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground text-center py-12">
          Could not load dashboard. Pull to refresh.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="flex items-center justify-between rounded-lg bg-[rgba(255,179,71,0.15)] px-4 py-2">
          <span className="text-sm font-medium text-[#FFB347]">Demo mode — this is sample data</span>
          <button onClick={() => setIsDemoMode(false)} className="text-[#FFB347] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Onboarding checklist */}
      <OnboardingChecklist />

      {/* Demo prompt */}
      {showDemoPrompt && (
        <div className="rounded-xl border-dashed border-2 p-4 text-center space-y-2">
          <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold">See FitDesk in action</p>
          <p className="text-xs text-muted-foreground">Preview with sample data to explore the dashboard</p>
          <Button size="sm" onClick={() => setIsDemoMode(true)}>Preview demo</Button>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {trainerName.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-muted-foreground text-sm">{today}</p>
      </div>

      {/* Pending approvals */}
      <PendingApprovalsCard />

      {/* Stat cards */}
      {isLoading ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-24 rounded-xl" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {/* Today's sessions */}
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => isDemoMode ? handleDemoNav() : router.push("/bookings")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Today&apos;s sessions</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{displayData?.todayBookingsCount ?? 0}</p>
              </CardContent>
            </Card>

            {/* Outstanding payments */}
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => isDemoMode ? handleDemoNav() : router.push("/payments")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Outstanding</span>
                </div>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(displayData?.outstandingPayments ?? 0)}
                </p>
                {(displayData?.pendingPaymentConfirmations ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    {displayData?.pendingPaymentConfirmations} awaiting confirmation
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business metrics row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Monthly revenue */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Revenue this month</span>
                </div>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(displayData?.monthlyRevenue ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Sessions this week */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Sessions this week</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{displayData?.sessionsThisWeek ?? 0}</p>
              </CardContent>
            </Card>

            {/* Overdue total */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${(displayData?.overdueTotal ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                  <span className="text-muted-foreground text-xs">Overdue</span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${(displayData?.overdueTotal ?? 0) > 0 ? "text-red-500" : ""}`}>
                  {formatCurrency(displayData?.overdueTotal ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Attendance rate */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserCheck className={`h-4 w-4 ${(displayData?.attendanceRate ?? 0) >= 80 ? "text-green-500" : "text-muted-foreground"}`} />
                  <span className="text-muted-foreground text-xs">Attendance rate</span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${(displayData?.attendanceRate ?? 0) >= 80 ? "text-green-500" : ""}`}>
                  {displayData?.attendanceRate !== null ? `${displayData?.attendanceRate}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lapsed clients stat */}
          {(displayData?.lapsedClients?.length ?? 0) > 0 && (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => isDemoMode ? handleDemoNav() : router.push("/clients")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground text-xs">Lapsed clients</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-500">{displayData?.lapsedClients.length}</p>
              </CardContent>
            </Card>
          )}

          {/* Renew soon card */}
          {displayData && displayData.lowSessionClients.length > 0 && (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => isDemoMode ? handleDemoNav() : router.push("/clients")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Renew soon</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{displayData.lowSessionClients.length}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Low session clients list */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ) : displayData && displayData.lowSessionClients.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Renew soon</h2>
          {displayData.lowSessionClients.map((client) => {
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
                onClick={() => isDemoMode ? handleDemoNav() : router.push(`/clients/${client.client_id}`)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{client.client_name}</p>
                </div>
                <Badge variant={client.sessions_remaining <= 1 ? "destructive" : "secondary"}>
                  {client.sessions_remaining} session{client.sessions_remaining !== 1 ? "s" : ""} left
                </Badge>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Lapsed clients list */}
      {!isLoading && displayData && displayData.lapsedClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Lapsed clients</h2>
          {displayData.lapsedClients.map((client) => {
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
                onClick={() => isDemoMode ? handleDemoNav() : router.push(`/clients/${client.client_id}`)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{client.client_name}</p>
                </div>
                <Badge className="bg-[rgba(255,179,71,0.15)] text-[#FFB347]">
                  {client.days_since_last_session} days
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
