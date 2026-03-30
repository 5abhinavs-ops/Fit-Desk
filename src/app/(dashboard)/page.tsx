"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarDays, DollarSign, AlertTriangle } from "lucide-react"
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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setTrainerName((user.user_metadata?.name as string) || "")
      }
    })
  }, [])

  const today = format(new Date(), "EEEE, d MMMM yyyy")

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
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {trainerName.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-muted-foreground text-sm">{today}</p>
      </div>

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
                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Today&apos;s sessions</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{data?.todayBookingsCount ?? 0}</p>
              </CardContent>
            </Card>

            {/* Outstanding payments */}
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push("/payments")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Outstanding</span>
                </div>
                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(data?.outstandingPayments ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Renew soon card */}
          {data && data.lowSessionClients.length > 0 && (
            <Card
              className="cursor-pointer transition-colors hover:bg-accent"
              onClick={() => router.push("/clients")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">Renew soon</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{data.lowSessionClients.length}</p>
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
                <Badge variant={client.sessions_remaining <= 1 ? "destructive" : "secondary"}>
                  {client.sessions_remaining} session{client.sessions_remaining !== 1 ? "s" : ""} left
                </Badge>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
