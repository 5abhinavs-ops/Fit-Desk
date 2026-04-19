"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarDays, DollarSign, AlertTriangle, TrendingUp, Dumbbell, AlertCircle, UserCheck, UserMinus } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card"
import { handleKeyboardActivation } from "@/lib/a11y"
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
  const [greeting, setGreeting] = useState("")
  const [today, setToday] = useState("")

  /* eslint-disable react-hooks/set-state-in-effect -- client-only auth user + locale-dependent greeting/date derivation, intentional */
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setTrainerName((user.user_metadata?.name as string) || "")
      }
    })
    setGreeting(getGreeting())
    setToday(format(new Date(), "EEEE, d MMMM yyyy"))
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

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
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting || "Welcome"}, {trainerName.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-muted-foreground text-body-lg">{today}</p>
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
              onClick={() => router.push("/bookings")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={CalendarDays} size="sm" className="text-[#00C6D4]" />
                  <span className="text-muted-foreground text-body-sm">Today&apos;s sessions</span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular">{data?.todayBookingsCount ?? 0}</p>
              </CardContent>
            </Card>

            {/* Outstanding payments */}
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push("/payments")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={DollarSign} size="sm" className="text-[#FFB347]" />
                  <span className="text-muted-foreground text-body-sm">Outstanding</span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-[#FFB347] tabular">
                  {formatCurrency(data?.outstandingPayments ?? 0)}
                </p>
                {(data?.pendingPaymentConfirmations ?? 0) > 0 && (
                  <p className="mt-1 text-body-sm text-[#FFB347]">
                    {data?.pendingPaymentConfirmations} awaiting confirmation
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
                  <Icon name={TrendingUp} size="sm" className="text-[#00E096]" />
                  <span className="text-muted-foreground text-body-sm">Revenue this month</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#00E096] tabular">
                  {formatCurrency(data?.monthlyRevenue ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Sessions this week */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={Dumbbell} size="sm" className="text-[#00C6D4]" />
                  <span className="text-muted-foreground text-body-sm">Sessions this week</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular">{data?.sessionsThisWeek ?? 0}</p>
              </CardContent>
            </Card>

            {/* Overdue total */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={AlertCircle} size="sm" className="text-[#FF4C7A]" />
                  <span className="text-muted-foreground text-body-sm">Overdue</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#FF4C7A] tabular">
                  {formatCurrency(data?.overdueTotal ?? 0)}
                </p>
              </CardContent>
            </Card>

            {/* Attendance rate */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={UserCheck} size="sm" className={(data?.attendanceRate ?? 0) >= 80 ? "text-[#00E096]" : "text-[#FF4C7A]"} />
                  <span className="text-muted-foreground text-body-sm">Attendance rate</span>
                </div>
                <p className={`mt-2 text-2xl font-semibold tabular ${(data?.attendanceRate ?? 0) >= 80 ? "text-[#00E096]" : "text-[#FF4C7A]"}`}>
                  {data?.attendanceRate !== null ? `${data?.attendanceRate}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lapsed clients stat */}
          {(data?.lapsedClients?.length ?? 0) > 0 && (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push("/clients")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={UserMinus} size="sm" className="text-[#FF4C7A]" />
                  <span className="text-muted-foreground text-body-sm">Lapsed clients</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#FF4C7A] tabular">{data?.lapsedClients.length}</p>
              </CardContent>
            </Card>
          )}

          {/* Renew soon card */}
          {data && data.lowSessionClients.length > 0 && (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push("/clients")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name={AlertTriangle} size="sm" className="text-[#FFB347]" />
                  <span className="text-muted-foreground text-body-sm">Renew soon</span>
                </div>
                <p className="mt-2 text-3xl font-semibold text-[#FFB347] tabular">{data.lowSessionClients.length}</p>
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
      ) : data && data.lowSessionClients.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Renew soon</h2>
          {data.lowSessionClients.map((client) => {
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
                <Badge variant={client.sessions_remaining <= 1 ? "destructive" : "secondary"}>
                  {client.sessions_remaining} session{client.sessions_remaining !== 1 ? "s" : ""} left
                </Badge>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Lapsed clients list */}
      {!isLoading && data && data.lapsedClients.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Lapsed clients</h2>
          {data.lapsedClients.map((client) => {
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
