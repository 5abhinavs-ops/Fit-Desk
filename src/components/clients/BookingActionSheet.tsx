"use client"

import { useState } from "react"
import type { Booking } from "@/types/database"
import { createClient } from "@/lib/supabase/client"
import { usePackages } from "@/hooks/usePackages"
import { useQueryClient } from "@tanstack/react-query"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
import { toast } from "sonner"
import { PaymentSection } from "@/components/bookings/payment-section"
import { Loader2, RotateCcw, Ban, UserX, CalendarClock } from "lucide-react"
import { format } from "date-fns"

type ActionType = "restore" | "forfeit" | "no_show" | "reschedule"

interface BookingActionSheetProps {
  booking: Booking
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  cancellationPolicyHours?: number
}

const ACTION_CONFIG: Record<ActionType, {
  icon: typeof RotateCcw
  label: string
  description: string
  variant: "default" | "outline" | "destructive"
}> = {
  restore: {
    icon: RotateCcw,
    label: "Cancel & restore session",
    description: "Cancel the booking and return the session to the client's package.",
    variant: "outline",
  },
  forfeit: {
    icon: Ban,
    label: "Cancel & forfeit session",
    description: "Cancel the booking. The session counts as used (not returned to package).",
    variant: "outline",
  },
  no_show: {
    icon: UserX,
    label: "Mark as no-show",
    description: "Client did not attend. The session counts as used.",
    variant: "destructive",
  },
  reschedule: {
    icon: CalendarClock,
    label: "Reschedule",
    description: "Cancel this booking and create a new one at a different time.",
    variant: "outline",
  },
}

export function BookingActionSheet({
  booking,
  clientName,
  open,
  onOpenChange,
  cancellationPolicyHours = 24,
}: BookingActionSheetProps) {
  const queryClient = useQueryClient()
  const { data: packages } = usePackages(booking.client_id)
  const [pending, setPending] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [paymentAmount, setPaymentAmount] = useState(booking.payment_amount ? String(booking.payment_amount) : "")
  const [paymentPending, setPaymentPending] = useState(false)
  const [sessionNotes, setSessionNotes] = useState(booking.session_notes || "")
  const [notesSaving, setNotesSaving] = useState(false)

  const bookingTime = new Date(booking.date_time)
  const isActionable = ["confirmed", "pending", "upcoming", "pending_approval"].includes(booking.status)

  async function saveNotes() {
    setNotesSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Not authenticated"); setNotesSaving(false); return }
    const { error } = await supabase
      .from("bookings")
      .update({ session_notes: sessionNotes || null })
      .eq("id", booking.id)
      .eq("trainer_id", user.id)
    if (error) {
      toast.error("Failed to save notes")
    } else {
      toast.success("Notes saved")
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
    }
    setNotesSaving(false)
  }

  const activePackage = packages?.find((p) => p.id === booking.package_id && p.status === "active")
  const sessionsRemaining = activePackage
    ? activePackage.total_sessions - activePackage.sessions_used
    : null

  async function executeAction(action: ActionType) {
    setPending(true)
    try {
      const body: Record<string, string> = { action }
      if (action === "reschedule") {
        if (!rescheduleDate || !rescheduleTime) {
          toast.error("Please select a new date and time")
          setPending(false)
          return
        }
        body.reschedule_date = rescheduleDate
        body.reschedule_time = rescheduleTime
      }

      const res = await fetch(`/api/bookings/${booking.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Action failed")
        return
      }

      const labels: Record<ActionType, string> = {
        restore: "Session cancelled and restored",
        forfeit: "Session cancelled and forfeited",
        no_show: "Marked as no-show",
        reschedule: "Session rescheduled",
      }
      toast.success(labels[action])
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["packages"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      onOpenChange(false)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setPending(false)
      setConfirmAction(null)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{clientName}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pt-4">
            {/* Booking info */}
            <div className="text-sm space-y-1">
              <p>{format(bookingTime, "EEEE, d MMMM yyyy · h:mm a")}</p>
              {booking.location && (
                <p className="text-muted-foreground">{booking.location}</p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary">{booking.status}</Badge>
                {booking.session_type !== "1-on-1" && (
                  <Badge variant="outline">{booking.session_type}</Badge>
                )}
              </div>
            </div>

            {/* Package info */}
            {sessionsRemaining !== null && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">Package: {activePackage?.name}</p>
                <p className="text-muted-foreground">
                  {sessionsRemaining} session{sessionsRemaining !== 1 ? "s" : ""} remaining
                </p>
              </div>
            )}

            {/* Payment section */}
            <PaymentSection
              booking={booking}
              paymentAmount={paymentAmount}
              onAmountChange={setPaymentAmount}
              paymentPending={paymentPending}
              onPaymentAction={async (action: "mark_paid" | "waive") => {
                setPaymentPending(true)
                try {
                  const body: Record<string, string | number> = { action }
                  if (paymentAmount) body.amount = parseFloat(paymentAmount)
                  const res = await fetch(`/api/bookings/${booking.id}/payment`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    toast.error(data.error || "Failed")
                    return
                  }
                  toast.success(action === "mark_paid" ? "Payment confirmed" : "Payment waived")
                  queryClient.invalidateQueries({ queryKey: ["bookings"] })
                  queryClient.invalidateQueries({ queryKey: ["dashboard"] })
                } catch {
                  toast.error("Something went wrong")
                } finally {
                  setPaymentPending(false)
                }
              }}
            />

            {/* Session notes */}
            <div className="space-y-2">
              <Label htmlFor="session-notes" className="text-sm font-medium">Session notes</Label>
              <Textarea
                id="session-notes"
                placeholder="What did you work on this session?"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={saveNotes}
                disabled={notesSaving}
              >
                {notesSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Save notes
              </Button>
            </div>

            {/* Cancellation policy hint */}
            <p className="text-muted-foreground text-xs">
              Your policy: free cancel {cancellationPolicyHours}h+ before session
            </p>

            {/* Action buttons */}
            {isActionable ? (
              <div className="space-y-2">
                {(Object.keys(ACTION_CONFIG) as ActionType[]).map((action) => {
                  const config = ACTION_CONFIG[action]
                  const Icon = config.icon
                  return (
                    <Button
                      key={action}
                      variant={config.variant}
                      className="w-full justify-start gap-3 h-auto py-3"
                      onClick={() => setConfirmAction(action)}
                      disabled={pending}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground font-normal">
                          {config.description}
                        </p>
                      </div>
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {booking.status === "completed" && "This session is complete."}
                {booking.status === "cancelled" && "This session was cancelled."}
                {booking.status === "forfeited" && "This session was forfeited."}
                {(booking.status === "no-show" || booking.status === "no_show") && "This session was a no-show."}
                {!["completed", "cancelled", "forfeited", "no-show", "no_show"].includes(booking.status) &&
                  "No actions available."}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction && ACTION_CONFIG[confirmAction].label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && ACTION_CONFIG[confirmAction].description}
              {" "}A WhatsApp notification will be sent to the client.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction === "reschedule" && (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="reschedule-date">New date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reschedule-time">New time</Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
