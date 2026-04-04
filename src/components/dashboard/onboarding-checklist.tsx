"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Check, Circle, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ChecklistStep {
  key: string
  label: string
  done: boolean
  action?: React.ReactNode
}

export function OnboardingChecklist() {
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [steps, setSteps] = useState<ChecklistStep[]>([])

  const checkSteps = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, booking_slug, onboarding_completed, paynow_number, bank_account_number")
      .eq("id", user.id)
      .single()

    if (!profile || profile.onboarding_completed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    setProfileId(profile.id)

    const { count: clientCount } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })

    const { count: packageCount } = await supabase
      .from("packages")
      .select("id", { count: "exact", head: true })

    const hasPayment = !!(profile.paynow_number || profile.bank_account_number)
    const bookingUrl = `fitdesk.app/book/${profile.booking_slug}`

    const checklist: ChecklistStep[] = [
      {
        key: "profile",
        label: "Profile set up",
        done: true,
      },
      {
        key: "client",
        label: "Add your first client",
        done: (clientCount ?? 0) > 0,
        action: (
          <Link href="/clients" className="text-xs text-primary hover:underline">
            Add client
          </Link>
        ),
      },
      {
        key: "package",
        label: "Create your first package",
        done: (packageCount ?? 0) > 0,
        action: (
          <Link href="/clients" className="text-xs text-primary hover:underline">
            Go to clients
          </Link>
        ),
      },
      {
        key: "booking_link",
        label: "Share your booking link",
        done: false, // Manual step — user copies the link
        action: (
          <Button
            size="sm"
            variant="ghost"
            className="h-auto py-0.5 px-1.5 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(`https://${bookingUrl}`)
              toast.success("Booking link copied!")
            }}
          >
            <Copy className="mr-1 h-3 w-3" />
            {bookingUrl}
          </Button>
        ),
      },
      {
        key: "payment",
        label: "Set up payment details",
        done: hasPayment,
        action: (
          <Link href="/profile" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Payment settings <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
    ]

    setSteps(checklist)
    setLoading(false)

    // Auto-dismiss if all done (except booking_link which is manual)
    const autoCompletable = checklist.filter((s) => s.key !== "booking_link")
    if (autoCompletable.every((s) => s.done)) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", profile.id)
      setDismissed(true)
    }
  }, [])

  useEffect(() => {
    checkSteps()
  }, [checkSteps])

  async function handleDismiss() {
    if (profileId) {
      const supabase = createClient()
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", profileId)
    }
    setDismissed(true)
  }

  if (loading || dismissed) return null

  const doneCount = steps.filter((s) => s.done).length
  const progressPct = (doneCount / steps.length) * 100

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Getting started</h3>
          <span className="text-xs text-muted-foreground">{doneCount}/{steps.length}</span>
        </div>

        <Progress value={progressPct} className="h-2" />

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.key} className="flex items-start gap-3">
              {step.done ? (
                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${step.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                  {step.label}
                </p>
                {!step.done && step.action && (
                  <div className="mt-0.5">{step.action}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={handleDismiss}
        >
          Dismiss
        </Button>
      </CardContent>
    </Card>
  )
}
