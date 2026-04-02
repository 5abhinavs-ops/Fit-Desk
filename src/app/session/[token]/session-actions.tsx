"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { CheckCircle, XCircle, Clock, CalendarClock, Loader2 } from "lucide-react"

type SessionAction = "confirm" | "cancel" | "late" | "reschedule"

interface SessionActionsProps {
  bookingId: string
  token: string
  cancellationPolicyHours: number
  sessionDateTime: string
}

export function SessionActions({
  bookingId,
  token,
  cancellationPolicyHours,
  sessionDateTime,
}: SessionActionsProps) {
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [resultMessage, setResultMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<SessionAction | null>(null)
  const [lateMinutes, setLateMinutes] = useState("10")

  const hoursUntil = (new Date(sessionDateTime).getTime() - Date.now()) / (1000 * 60 * 60)
  const canCancelFree = hoursUntil >= cancellationPolicyHours

  async function executeAction(action: SessionAction) {
    setPending(true)
    try {
      if (action === "cancel") {
        // Use the cancel endpoint
        const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, reason: "Client cancelled via session link" }),
        })
        const data = await res.json()
        if (!res.ok) {
          setResultMessage(data.error || "Failed to cancel")
        } else {
          setResultMessage(data.message)
        }
      } else {
        // Use the session token action endpoint
        const body: Record<string, string | number> = { action }
        if (action === "late") {
          body.late_minutes = parseInt(lateMinutes, 10)
        }

        const res = await fetch(`/api/session/${token}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          setResultMessage(data.error || "Something went wrong")
        } else {
          const messages: Record<string, string> = {
            confirm: "You've confirmed your attendance. See you there!",
            late: `Your trainer has been notified that you're running ${lateMinutes} minutes late.`,
            reschedule: "Your reschedule request has been sent to your trainer.",
          }
          setResultMessage(messages[action] || "Done!")
        }
      }
      setCompleted(true)
    } catch {
      setResultMessage("Something went wrong. Please try again.")
    } finally {
      setPending(false)
      setConfirmAction(null)
    }
  }

  if (completed) {
    return (
      <div className="rounded-xl border p-6 text-center space-y-2">
        <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
        <p className="text-sm">{resultMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          className="w-full justify-start gap-3 h-auto py-3 bg-green-600 hover:bg-green-700"
          onClick={() => setConfirmAction("confirm")}
          disabled={pending}
        >
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Confirm attendance</p>
            <p className="text-xs opacity-80 font-normal">Let your trainer know you&apos;re coming</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => setConfirmAction("late")}
          disabled={pending}
        >
          <Clock className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Running late</p>
            <p className="text-xs text-muted-foreground font-normal">Notify your trainer</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => setConfirmAction("reschedule")}
          disabled={pending}
        >
          <CalendarClock className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Request reschedule</p>
            <p className="text-xs text-muted-foreground font-normal">Ask your trainer for a new time</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700"
          onClick={() => setConfirmAction("cancel")}
          disabled={pending}
        >
          <XCircle className="h-5 w-5 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium">Cancel session</p>
            <p className="text-xs text-muted-foreground font-normal">
              {canCancelFree
                ? "Free cancellation — session will be restored"
                : "Late cancellation — session will be forfeited"}
            </p>
          </div>
        </Button>
      </div>

      <p className="text-muted-foreground text-xs text-center">
        Free cancellation up to {cancellationPolicyHours}h before session
      </p>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "confirm" && "Confirm attendance?"}
              {confirmAction === "cancel" && "Cancel session?"}
              {confirmAction === "late" && "Running late?"}
              {confirmAction === "reschedule" && "Request reschedule?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "confirm" && "Your trainer will be notified that you're confirmed."}
              {confirmAction === "cancel" && (
                canCancelFree
                  ? "Your session will be restored to your package."
                  : "As per the cancellation policy, this session will be forfeited."
              )}
              {confirmAction === "late" && "Select how many minutes late you'll be."}
              {confirmAction === "reschedule" && "Your trainer will receive your request and get back to you."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmAction === "late" && (
            <div className="py-2">
              <Select value={lateMinutes} onValueChange={(v) => setLateMinutes(v ?? "10")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Back</AlertDialogCancel>
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
