"use client"

import { useState, useRef } from "react"
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
import { CheckCircle, XCircle, Clock, CalendarClock, Loader2, CreditCard } from "lucide-react"
import { Icon } from "@/components/ui/icon"

type SessionAction = "confirm" | "cancel" | "late" | "reschedule" | "payment_confirm"

interface SessionActionsProps {
  bookingId: string
  token: string
  cancellationPolicyHours: number
  sessionDateTime: string
  showPaymentButton?: boolean
}

export function SessionActions({
  bookingId,
  token,
  cancellationPolicyHours,
  sessionDateTime,
  showPaymentButton = false,
}: SessionActionsProps) {
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [resultMessage, setResultMessage] = useState("")
  const [confirmAction, setConfirmAction] = useState<SessionAction | null>(null)
  const [lateMinutes, setLateMinutes] = useState("10")
  const [showProofUpload, setShowProofUpload] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  // Stable per-mount timestamp — matches the sibling sessions page so the
  // "Cancel free" vs "Cancel forfeit" labels and the API enforcement can't disagree.
  // Server-side /api/bookings/[id]/cancel is the source of truth for policy.
  const [nowMs] = useState(() => Date.now())

  const hoursUntil = (new Date(sessionDateTime).getTime() - nowMs) / (1000 * 60 * 60)
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
            payment_confirm: data.message || "Payment marked — your PT will confirm shortly",
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

  async function handleProofSubmit() {
    if (!proofFile) return
    setPending(true)
    try {
      const formData = new FormData()
      formData.append("file", proofFile)
      formData.append("token", token)
      formData.append("booking_id", bookingId)

      const res = await fetch("/api/session/upload-payment-proof", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setResultMessage(data.error || "Upload failed. Try again.")
      } else {
        setResultMessage(
          "Payment proof submitted — your trainer will confirm shortly."
        )
      }
      setCompleted(true)
    } catch {
      setResultMessage("Something went wrong. Please try again.")
      setCompleted(true)
    } finally {
      setPending(false)
    }
  }

  if (completed) {
    return (
      <div className="rounded-xl border p-6 text-center space-y-2">
        {/* 40px success glyph centered above completion message — above lg (24px) */}
        <Icon name={CheckCircle} size="lg" className="mx-auto size-10 text-green-600" />
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
          <Icon name={CheckCircle} size="md" className="shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold">Confirm attendance</p>
            <p className="text-xs opacity-80 font-normal">Let your trainer know you&apos;re coming</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => setConfirmAction("late")}
          disabled={pending}
        >
          <Icon name={Clock} size="md" className="shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold">Running late</p>
            <p className="text-xs text-muted-foreground font-normal">Notify your trainer</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3"
          onClick={() => setConfirmAction("reschedule")}
          disabled={pending}
        >
          <Icon name={CalendarClock} size="md" className="shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold">Request reschedule</p>
            <p className="text-xs text-muted-foreground font-normal">Ask your trainer for a new time</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-3 text-red-600 hover:text-red-700"
          onClick={() => setConfirmAction("cancel")}
          disabled={pending}
        >
          <Icon name={XCircle} size="md" className="shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold">Cancel session</p>
            <p className="text-xs text-muted-foreground font-normal">
              {canCancelFree
                ? "Free cancellation — session will be restored"
                : "Late cancellation — session will be forfeited"}
            </p>
          </div>
        </Button>

        {showPaymentButton && !showProofUpload && (
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={() => setShowProofUpload(true)}
            disabled={pending}
          >
            <Icon name={CreditCard} size="md" className="shrink-0" />
            <div className="text-left">
              <p className="text-sm font-semibold">I&apos;ve made payment</p>
              <p className="text-xs text-muted-foreground font-normal">Upload proof and notify your trainer</p>
            </div>
          </Button>
        )}
      </div>

      {/* Proof upload panel */}
      {showProofUpload && (
        <div className="space-y-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-semibold">Confirm your payment</p>
            <p className="text-xs text-muted-foreground mt-1">
              For your trainer&apos;s convenience, please upload your payment screenshot
            </p>
          </div>

          <input
            ref={proofInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setProofFile(f)
              setProofPreview(URL.createObjectURL(f))
            }}
          />

          {proofPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Payment proof"
                className="w-full max-h-48 object-contain rounded-lg border"
              />
              <button
                className="absolute top-2 right-2 bg-background/80 rounded-full px-2 py-0.5 text-xs"
                onClick={() => { setProofFile(null); setProofPreview(null) }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
              onClick={() => proofInputRef.current?.click()}
            >
              {/* 28px payment glyph in wide action tile — between lg (24) and next increment */}
              <Icon name={CreditCard} size="lg" className="size-7" />
              <span className="text-sm">Tap to upload screenshot</span>
            </button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowProofUpload(false)
                setProofFile(null)
                setProofPreview(null)
              }}
              disabled={pending}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!proofFile || pending}
              onClick={() => handleProofSubmit()}
            >
              {pending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      )}

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
              {pending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
