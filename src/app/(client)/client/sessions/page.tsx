"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CalendarDays, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import type { Booking } from "@/types/database"

const statusColors: Record<string, string> = {
  completed: "badge-success",
  confirmed: "badge-cyan",
  pending: "badge-warning",
  upcoming: "badge-cyan",
  cancelled: "badge-neutral",
  "no-show": "badge-danger",
  no_show: "badge-danger",
  forfeited: "badge-warning",
}

export default function ClientSessionsPage() {
  const { data: identity, isLoading: identityLoading } = useClientIdentity()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const clientId = identity?.id
  const policyHours = identity?.trainer?.cancellation_policy_hours ?? 24

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Upcoming sessions
  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ["client-upcoming-sessions", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", clientId!)
        .in("status", ["confirmed", "pending", "upcoming", "pending_approval"])
        .gte("date_time", new Date().toISOString())
        .order("date_time", { ascending: true })
      return (data ?? []) as Booking[]
    },
    enabled: !!clientId,
  })

  // Past sessions
  const { data: past, isLoading: pastLoading } = useQuery({
    queryKey: ["client-past-sessions", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", clientId!)
        .lt("date_time", new Date().toISOString())
        .order("date_time", { ascending: false })
        .limit(30)
      return (data ?? []) as Booking[]
    },
    enabled: !!clientId,
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await fetch("/api/client/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to cancel")
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(
        data.forfeited
          ? "Session cancelled (forfeit — within cancellation window)"
          : "Session cancelled"
      )
      queryClient.invalidateQueries({ queryKey: ["client-upcoming-sessions"] })
      queryClient.invalidateQueries({ queryKey: ["client-past-sessions"] })
      setCancelTarget(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (identityLoading || upcomingLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  function renderBookingCard(booking: Booking, showCancel: boolean) {
    const hoursUntil =
      (new Date(booking.date_time).getTime() - Date.now()) / (1000 * 60 * 60)
    const isExpanded = expandedId === booking.id
    const canCancel = showCancel && hoursUntil > 0

    return (
      <Card key={booking.id}>
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() =>
              setExpandedId(isExpanded ? null : booking.id)
            }
          >
            <div>
              <p className="font-semibold">
                {format(new Date(booking.date_time), "EEE, d MMM")}
              </p>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-0.5">
                <span>
                  {format(new Date(booking.date_time), "h:mm a")}
                </span>
                <span>{booking.duration_mins} min</span>
                {booking.location && <span>{booking.location}</span>}
              </div>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${statusColors[booking.status] ?? "badge-neutral"}`}
            >
              {booking.status.replace(/_/g, " ")}
            </span>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {booking.session_notes && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[13px] text-muted-foreground">
                    Notes from {identity?.trainer?.name ?? "your trainer"}:
                  </p>
                  <p className="text-sm mt-1">{booking.session_notes}</p>
                </div>
              )}

              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[#FF4C7A] border-[#FF4C7A]/30"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCancelTarget(booking)
                  }}
                >
                  {hoursUntil >= policyHours
                    ? "Cancel (free)"
                    : "Cancel (forfeit)"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-[#FFB347]" />
        Sessions
      </h1>

      {/* Upcoming */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Upcoming
        </h2>
        {(upcoming ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No upcoming sessions
          </p>
        ) : (
          (upcoming ?? []).map((b) => renderBookingCard(b, true))
        )}
      </div>

      {/* Past */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Past
        </h2>
        {pastLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : (past ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">No past sessions</p>
        ) : (
          (past ?? []).map((b) => renderBookingCard(b, false))
        )}
      </div>

      {/* Cancel confirmation */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel session?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget &&
              (new Date(cancelTarget.date_time).getTime() - Date.now()) /
                (1000 * 60 * 60) <
                policyHours
                ? `This session is within the ${policyHours}-hour cancellation window. The session will be forfeited.`
                : "This will cancel your upcoming session. Your trainer will be notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep session</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FF4C7A] hover:bg-[#FF4C7A]/80"
              onClick={() => {
                if (cancelTarget) {
                  cancelMutation.mutate(cancelTarget.id)
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Cancel session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
