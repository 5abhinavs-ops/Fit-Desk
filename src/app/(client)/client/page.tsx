"use client"

import { useQuery } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  CalendarDays,
  Package,
  AlertCircle,
  MessageCircle,
  Clock,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ClientHomePage() {
  const { data: identity, isLoading: identityLoading } = useClientIdentity()
  const supabase = createClient()
  const clientId = identity?.id

  // Next upcoming session
  const { data: nextSession } = useQuery({
    queryKey: ["client-next-session", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", clientId!)
        .in("status", ["confirmed", "pending", "upcoming"])
        .gte("date_time", new Date().toISOString())
        .order("date_time", { ascending: true })
        .limit(1)
        .single()
      return data
    },
    enabled: !!clientId,
  })

  // Active package
  const { data: activePackage } = useQuery({
    queryKey: ["client-active-package", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("client_id", clientId!)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()
      return data
    },
    enabled: !!clientId,
  })

  // Outstanding payment
  const { data: outstandingPayment } = useQuery({
    queryKey: ["client-outstanding-payment", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("client_id", clientId!)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true })
        .limit(1)
        .single()
      return data
    },
    enabled: !!clientId,
  })

  if (identityLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    )
  }

  if (!identity) {
    return (
      <p className="text-muted-foreground">
        Could not load your profile. Please try again.
      </p>
    )
  }

  const trainer = identity.trainer
  const greeting = new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 17
      ? "Good afternoon"
      : "Good evening"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {greeting}, {identity.first_name}
        </h1>
        <p className="text-muted-foreground text-[15px]">
          {format(new Date(), "EEEE, d MMMM")}
        </p>
      </div>

      {/* Next session */}
      <Card className="card-border-cyan">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-4 w-4 text-[#00C6D4]" />
            <span className="text-muted-foreground text-[13px]">
              Next session
            </span>
          </div>
          {nextSession ? (
            <div>
              <p className="text-lg font-semibold">
                {format(new Date(nextSession.date_time), "EEEE, d MMM")}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[15px]">
                <span>
                  {format(new Date(nextSession.date_time), "h:mm a")}
                </span>
                <span className="text-muted-foreground">
                  {nextSession.duration_mins} min
                </span>
                {nextSession.location && (
                  <span className="text-muted-foreground truncate">
                    {nextSession.location}
                  </span>
                )}
              </div>
              {(() => {
                const hoursUntil =
                  (new Date(nextSession.date_time).getTime() - Date.now()) /
                  (1000 * 60 * 60)
                if (hoursUntil <= 24 && hoursUntil > 0) {
                  return (
                    <div className="mt-2 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#FFB347]" />
                      <span className="text-[13px] text-[#FFB347]">
                        In {Math.round(hoursUntil)} hours
                      </span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground">No upcoming sessions</p>
              {trainer.booking_slug && (
                <Link
                  href={`/book/${trainer.booking_slug}`}
                  className="text-primary text-sm mt-1 inline-block"
                >
                  Book a session &rarr;
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package balance */}
      {activePackage && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-[#00E096]" />
              <span className="text-muted-foreground text-[13px]">
                {activePackage.name}
              </span>
            </div>
            {(() => {
              const remaining =
                activePackage.total_sessions - activePackage.sessions_used
              const pct =
                (activePackage.sessions_used / activePackage.total_sessions) *
                100
              const barColor =
                remaining > 2
                  ? "#00E096"
                  : remaining >= 1
                    ? "#FFB347"
                    : "#FF4C7A"

              return (
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold">{remaining}</p>
                    <span className="text-muted-foreground text-[13px]">
                      of {activePackage.total_sessions} sessions left
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  {remaining <= 2 && remaining > 0 && (
                    <p className="mt-1.5 text-[13px] text-[#FFB347]">
                      Only {remaining} session{remaining !== 1 ? "s" : ""} left
                    </p>
                  )}
                  {activePackage.expiry_date && (
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Expires{" "}
                      {format(
                        new Date(activePackage.expiry_date),
                        "d MMM yyyy"
                      )}
                    </p>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Outstanding payment */}
      {outstandingPayment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-[#FFB347]" />
              <span className="text-muted-foreground text-[13px]">
                Payment due
              </span>
            </div>
            <p className="text-2xl font-bold text-[#FFB347]">
              {formatCurrency(outstandingPayment.amount)}
            </p>
            {outstandingPayment.due_date && (
              <p className="text-[13px] text-muted-foreground mt-1">
                Due{" "}
                {format(new Date(outstandingPayment.due_date), "d MMM yyyy")}
              </p>
            )}
            <Link href="/client/payments">
              <Button variant="outline" size="sm" className="mt-3">
                View payments &rarr;
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* My trainer */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-sm">
                {trainer.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) ?? "PT"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{trainer.name}</p>
              <p className="text-[13px] text-muted-foreground">Your trainer</p>
            </div>
            {trainer.whatsapp_number && (
              <a
                href={`https://wa.me/${trainer.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
