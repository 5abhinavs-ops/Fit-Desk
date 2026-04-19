"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Circle,
  Copy,
  MessageCircle,
  UserPlus,
  CalendarClock,
  Share2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { AddClientWithPackageSheet } from "@/components/clients/AddClientWithPackageSheet"
import { useOnboarding } from "@/hooks/useOnboarding"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useClients } from "@/hooks/useClients"
import {
  ONBOARDING_STEPS,
  countCompletedSteps,
  isAllStepsComplete,
} from "@/lib/onboarding-steps"
import { buildWhatsappShareUrl } from "@/lib/whatsapp-share"
import { cn } from "@/lib/utils"

const AUTO_DISMISS_MS = 3000

export function OnboardingChecklist() {
  const {
    isLoading,
    onboardingCompleted,
    steps,
    bookingSlug,
    completeStep,
    dismissChecklist,
  } = useOnboarding()
  const { data: clients } = useClients()
  const reducedMotion = useReducedMotion()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [origin, setOrigin] = useState<string>("")
  const dismissedRef = useRef(false)

  /* eslint-disable react-hooks/set-state-in-effect -- window.location.origin
     is unavailable during SSR; deferring to client-only mount is intentional. */
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-complete "client_added" once the PT has at least one client.
  // completeStep is internally idempotent, so a repeat call is a no-op.
  const clientCount = clients?.length ?? 0
  useEffect(() => {
    if (isLoading) return
    if (onboardingCompleted) return
    if (steps.client_added) return
    if (clientCount > 0) {
      completeStep(ONBOARDING_STEPS.CLIENT_ADDED)
    }
  }, [clientCount, isLoading, onboardingCompleted, steps.client_added, completeStep])

  const completedCount = countCompletedSteps(steps)
  const allDone = isAllStepsComplete(steps)

  // Fire dismissChecklist once 3s after the completion card appears.
  useEffect(() => {
    if (!allDone) return
    if (onboardingCompleted) return
    if (dismissedRef.current) return

    const timer = setTimeout(() => {
      dismissedRef.current = true
      dismissChecklist()
    }, AUTO_DISMISS_MS)

    return () => clearTimeout(timer)
  }, [allDone, onboardingCompleted, dismissChecklist])

  if (isLoading) return null
  if (onboardingCompleted) return null

  const bookingUrl =
    origin && bookingSlug ? `${origin}/book/${bookingSlug}` : ""

  // Completion card — replaces checklist when 3/3, auto-dismisses in 3s
  if (allDone) {
    return (
      <Card
        className={cn(
          "border-[#00E096]/30 bg-[rgba(0,224,150,0.08)]",
          !reducedMotion && "animate-in fade-in duration-300"
        )}
      >
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <p className="text-display-sm font-semibold">
            You&apos;re ready to train 💪
          </p>
          <p className="text-body-sm text-muted-foreground">
            Your business is set up. Go get that 7am client.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold">
              Get started
            </h2>
            <span className="text-muted-foreground text-body-sm tabular">
              {completedCount}/3
            </span>
          </div>

          {/* Step 1 — Add first client */}
          <StepRow
            icon={UserPlus}
            label="Add your first client"
            completed={steps.client_added === true}
            onClick={() => setSheetOpen(true)}
          />

          {/* Step 2 — Availability (optimistic completion on link-tap) */}
          <StepLinkRow
            icon={CalendarClock}
            label="Set your availability"
            href="/profile#availability"
            completed={steps.availability_set === true}
            onActivate={() =>
              completeStep(ONBOARDING_STEPS.AVAILABILITY_SET)
            }
          />

          {/* Step 3 — Share booking link (inline expander) */}
          <StepRow
            icon={Share2}
            label="Share your booking link"
            completed={steps.link_shared === true}
            onClick={() => {
              if (!bookingSlug) {
                toast.error(
                  "Set your booking link in Profile first, then come back to share it."
                )
                return
              }
              setShareOpen((v) => !v)
            }}
          />

          {shareOpen && bookingUrl && (
            <SharePanel
              bookingUrl={bookingUrl}
              onShared={() => completeStep(ONBOARDING_STEPS.LINK_SHARED)}
            />
          )}
        </CardContent>
      </Card>

      <AddClientWithPackageSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}

interface StepRowBaseProps {
  icon: LucideIcon
  label: string
  completed: boolean
}

function StepRow({
  icon,
  label,
  completed,
  onClick,
}: StepRowBaseProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
    >
      <CheckMark completed={completed} />
      <Icon name={icon} size="sm" className="text-muted-foreground" />
      <span
        className={cn(
          "flex-1 text-body-sm",
          completed && "text-muted-foreground line-through"
        )}
      >
        {label}
      </span>
    </button>
  )
}

function StepLinkRow({
  icon,
  label,
  href,
  completed,
  onActivate,
}: StepRowBaseProps & { href: string; onActivate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onActivate}
      className="hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] flex items-center gap-3 rounded-lg p-2 transition-colors"
    >
      <CheckMark completed={completed} />
      <Icon name={icon} size="sm" className="text-muted-foreground" />
      <span
        className={cn(
          "flex-1 text-body-sm",
          completed && "text-muted-foreground line-through"
        )}
      >
        {label}
      </span>
    </Link>
  )
}

function CheckMark({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <Icon
        name={CheckCircle2}
        size="sm"
        className="shrink-0 text-[#00E096]"
      />
    )
  }
  return (
    <Icon name={Circle} size="sm" className="text-muted-foreground shrink-0" />
  )
}

function SharePanel({
  bookingUrl,
  onShared,
}: {
  bookingUrl: string
  onShared: () => void
}) {
  const whatsappUrl = useMemo(
    () => buildWhatsappShareUrl(bookingUrl),
    [bookingUrl]
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      toast.success("Booking link copied")
      onShared()
    } catch {
      toast.error("Failed to copy. Select and copy manually.")
    }
  }

  return (
    <div className="bg-muted/40 space-y-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs break-all">{bookingUrl}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCopy}
        >
          <Icon name={Copy} size="sm" className="mr-1" />
          Copy link
        </Button>
        {/* Anchor styled as a button — wrapping <Button> inside <a> is invalid
            HTML (interactive content inside interactive content). */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onShared}
          className="focus-visible:ring-ring inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-[#25D366] px-3 text-xs font-medium text-white transition-colors hover:bg-[#1fb957] focus-visible:ring-2 focus-visible:outline-none"
        >
          <Icon name={MessageCircle} size="sm" className="mr-1" />
          Share on WhatsApp
        </a>
      </div>
    </div>
  )
}
