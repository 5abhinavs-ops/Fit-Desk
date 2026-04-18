"use client"

import { useState } from "react"
import { usePendingApprovals } from "@/hooks/useBookingApprovals"
import { useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Clock, Check, X, Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { format } from "date-fns"

export function PendingApprovalsCard() {
  const { data: approvals, isLoading } = usePendingApprovals()
  const queryClient = useQueryClient()
  const [actingOn, setActingOn] = useState<string | null>(null)

  if (isLoading || !approvals || approvals.length === 0) return null

  async function handleDecision(bookingId: string, decision: "approved" | "declined") {
    setActingOn(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed")
        return
      }
      toast.success(decision === "approved" ? "Booking approved" : "Booking declined")
      queryClient.invalidateQueries({ queryKey: ["booking-approvals"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    } catch {
      toast.error("Something went wrong")
    } finally {
      setActingOn(null)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name={Clock} size="sm" className="text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            Pending approval
          </span>
          <Badge variant="secondary" className="bg-[rgba(255,179,71,0.15)] text-[#FFB347]">
            {approvals.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {approvals.map((a) => {
            const dt = new Date(a.booking.date_time)
            const clientName = `${a.booking.clients.first_name} ${a.booking.clients.last_name}`
            const isActing = actingOn === a.booking_id

            return (
              <div key={a.id} className="rounded-lg bg-[#1A3349] p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold">{clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(dt, "EEE, d MMM · h:mm a")} · {a.booking.session_type}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleDecision(a.booking_id, "approved")}
                    disabled={isActing}
                  >
                    {isActing ? (
                      // 12px inside size="sm" action button
                      <Icon name={Loader2} size="sm" className="size-3 animate-spin" />
                    ) : (
                      // 12px inside size="sm" action button
                      <Icon name={Check} size="sm" className="size-3 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDecision(a.booking_id, "declined")}
                    disabled={isActing}
                  >
                    {/* 12px inside size="sm" action button */}
                    <Icon name={X} size="sm" className="size-3 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
