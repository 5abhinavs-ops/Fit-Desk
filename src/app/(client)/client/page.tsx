"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  CalendarDays,
  CalendarPlus,
  Package,
  AlertCircle,
  MessageCircle,
  Clock,
} from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { EmptyState } from "@/components/ui/empty-state"
import { format } from "date-fns"
import Link from "next/link"
import {
  differenceInCalendarDaysSingapore,
  formatGreetingLabelSingapore,
  formatTimeSingapore,
  formatWeekdayLongSingapore,
} from "@/lib/singapore-time"

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
  // Stable per-render timestamp for "hours until session" displays.
  // useState initializer is the React-idiomatic way to capture an impure
  // value once per mount without tripping the react-hooks/purity rule.
  const [nowMs] = useState(() => Date.now())

  // Next upcoming session
  const { data: nextSession, isLoading: nextSessionLoading } = useQuery({
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
  const now = new Date()
  const greetingLabel = formatGreetingLabelSingapore(now)
  const firstName = identity.first_name
  const slug = trainer.booking_slug?.trim()

  const daysUntilNext =
    nextSession?.date_time != null
      ? differenceInCalendarDaysSingapore(now, new Date(nextSession.date_time))
      : null

  const sessionWeekday = nextSession?.date_time
    ? formatWeekdayLongSingapore(nextSession.date_time)
    : ""
  const sessionTime = nextSession?.date_time
    ? formatTimeSingapore(nextSession.date_time)
    : ""

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-snug">
          {nextSessionLoading ? (
            <>
              {greetingLabel}, {firstName}
            </>
          ) : nextSession?.date_time ? (
            <>
              {greetingLabel}, {firstName} — your next session with{" "}
              {trainer.name} is {sessionWeekday} at {sessionTime}.
            </>
          ) : (
            <>
              {greetingLabel}, {firstName} — book your next session when
              you&apos;re ready
              {slug ? (
                <>
                  .{" "}
                  <Link
                    href={`/book/${slug}`}
                    className="text-primary font-medium underline-offset-4 hover:underline"
                  >
                    Book a session
                  </Link>
                </>
              ) : (
                "."
              )}
            </>
          )}
        </h1>
        {nextSessionLoading ? (
          <Skeleton className="h-5 w-full max-w-md" />
        ) : null}
      </div>

      {/* Countdown — only when an upcoming session exists */}
      {!nextSessionLoading && nextSession?.date_time && daysUntilNext != null ? (
        <Card className="border-[rgba(0,198,212,0.2)] bg-muted/30">
          <CardContent className="p-4">
            {daysUntilNext < 0 ? (
              <p className="text-body-lg font-medium">
                Your next session is coming up — {sessionWeekday} at {sessionTime}.
              </p>
            ) : daysUntilNext === 0 ? (
              <p className="text-body-lg font-medium">
                Your session is today at {sessionTime}. 💪
              </p>
            ) : daysUntilNext === 1 ? (
              <p className="text-body-lg font-medium">
                Your session is tomorrow at {sessionTime}.
              </p>
            ) : (
              <p className="text-body-lg font-medium">
                {daysUntilNext} days until your next session
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Next session */}
      <Card className="card-border-cyan">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name={CalendarDays} size="sm" className="text-[#00C6D4]" />
            <span className="text-muted-foreground text-body-sm">
              Next session
            </span>
          </div>
          {nextSession ? (
            <div>
              <p className="text-lg font-semibold">
                {format(new Date(nextSession.date_time), "EEEE, d MMM")}
              </p>
              <div className="flex items-center gap-3 mt-1 text-body-lg">
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
                  (new Date(nextSession.date_time).getTime() - nowMs) /
                  (1000 * 60 * 60)
                if (hoursUntil <= 24 && hoursUntil > 0) {
                  return (
                    <div className="mt-2 flex items-center gap-1">
                      {/* 14px to match text-body-sm caption inline */}
                      <Icon name={Clock} size="sm" className="size-3.5 text-[#FFB347]" />
                      <span className="text-body-sm text-[#FFB347]">
                        In {Math.round(hoursUntil)} hours
                      </span>
                    </div>
                  )
                }
                return null
              })()}
            </div>
          ) : (
            <EmptyState
              icon={CalendarPlus}
              title="No upcoming sessions"
              body={
                trainer.booking_slug
                  ? "Book your next session with your trainer."
                  : undefined
              }
              action={
                trainer.booking_slug
                  ? {
                      label: "Book a session",
                      href: `/book/${trainer.booking_slug}`,
                    }
                  : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Package balance */}
      {activePackage ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={Package} size="sm" className="text-[#00E096]" />
              <span className="text-muted-foreground text-body-sm">
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

              const pctWidth = `${Math.min(pct, 100)}%`
              return (
                <div>
                  <p className="text-2xl font-semibold tabular">
                    {remaining}{" "}
                    {remaining === 1 ? "session" : "sessions"} remaining
                  </p>
                  <p className="text-muted-foreground text-body-sm mt-0.5">
                    {activePackage.name} · {activePackage.total_sessions} total
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="progress-bar-animated h-2 rounded-full"
                      style={{ width: pctWidth, background: barColor }}
                    />
                  </div>
                  {remaining <= 2 && remaining > 0 && (
                    <p className="mt-1.5 text-body-sm text-[#FFB347]">
                      Only {remaining} session{remaining !== 1 ? "s" : ""} left
                    </p>
                  )}
                  {activePackage.expiry_date && (
                    <p className="mt-1 text-body-sm text-muted-foreground">
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
      ) : (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Package}
              title="No active package"
              body="Ask your trainer to set up a package so you can start booking sessions."
              action={
                trainer.whatsapp_number
                  ? {
                      label: "Message trainer",
                      href: `https://wa.me/${trainer.whatsapp_number.replace(/\D/g, "")}`,
                      external: true,
                    }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Outstanding payment */}
      {outstandingPayment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name={AlertCircle} size="sm" className="text-[#FFB347]" />
              <span className="text-muted-foreground text-body-sm">
                Payment due
              </span>
            </div>
            <p className="text-2xl font-semibold text-[#FFB347] tabular">
              {formatCurrency(outstandingPayment.amount)}
            </p>
            {outstandingPayment.due_date && (
              <p className="text-body-sm text-muted-foreground mt-1">
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
              <p className="text-body-sm text-muted-foreground">Your trainer</p>
            </div>
            {trainer.whatsapp_number && (
              <a
                href={`https://wa.me/${trainer.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Icon name={MessageCircle} size="sm" className="mr-1" />
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
