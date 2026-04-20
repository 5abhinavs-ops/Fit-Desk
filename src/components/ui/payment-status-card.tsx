"use client"

import { useEffect, useState, type ReactElement } from "react"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { format } from "date-fns"

import type { PaymentStatus } from "@/types/database"
import { Icon } from "@/components/ui/icon"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

export interface PaymentStatusCardProps {
  status: PaymentStatus
  dueDate?: string | null
  receivedDate?: string | null
  proofUploadedAt?: string | null
  // Callers can opt out of the motion branch (e.g., in tests, or in surfaces
  // where a parent animation is already running). Default true.
  showMotion?: boolean
  className?: string
}

interface StatusTheme {
  color: string
  background: string
  border: string
  icon: LucideIcon
}

function assertNever(value: never): never {
  throw new Error(`Unhandled PaymentStatus variant: ${String(value)}`)
}

function getTheme(status: PaymentStatus): StatusTheme {
  switch (status) {
    case "pending":
      return {
        color: "var(--fd-amber)",
        background: "rgba(255,179,71,0.08)",
        border: "rgba(255,179,71,0.25)",
        icon: Clock,
      }
    case "overdue":
      return {
        color: "var(--fd-pink)",
        background: "rgba(255,76,122,0.08)",
        border: "rgba(255,76,122,0.25)",
        icon: AlertCircle,
      }
    case "client_confirmed":
      return {
        color: "var(--fd-cyan)",
        background: "rgba(0,198,212,0.08)",
        border: "rgba(0,198,212,0.25)",
        icon: CheckCircle,
      }
    case "received":
      return {
        color: "var(--fd-green)",
        background: "rgba(0,224,150,0.08)",
        border: "rgba(0,224,150,0.25)",
        icon: CheckCircle,
      }
    default:
      return assertNever(status)
  }
}

function isValidDate(iso: string): boolean {
  const ms = new Date(iso).getTime()
  return !Number.isNaN(ms)
}

function formatDateOnly(dateOnly: string): string {
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by default;
  // append noon to avoid same-day timezone flips on display.
  const normalised = `${dateOnly}T12:00:00`
  if (!isValidDate(normalised)) return "—"
  return format(new Date(normalised), "d MMM yyyy")
}

function formatProofTimestamp(iso: string): string {
  if (!isValidDate(iso)) return "Proof uploaded"
  return `Proof uploaded ${format(new Date(iso), "d MMM, h:mm a")}`
}

function daysSinceDue(dueDate: string): number {
  const normalised = `${dueDate}T12:00:00`
  if (!isValidDate(normalised)) return 0
  return Math.floor(
    (Date.now() - new Date(normalised).getTime()) / (1000 * 60 * 60 * 24),
  )
}

function getTitle(props: PaymentStatusCardProps): string {
  switch (props.status) {
    case "pending":
      return "Payment pending"
    case "overdue": {
      const days = props.dueDate ? daysSinceDue(props.dueDate) : 0
      return `${days} day${days !== 1 ? "s" : ""} overdue`
    }
    case "client_confirmed":
      return "Client confirmed payment"
    case "received":
      return "Payment received"
    default:
      return assertNever(props.status)
  }
}

function getSubtitle(props: PaymentStatusCardProps): string | null {
  switch (props.status) {
    case "pending":
      return props.dueDate
        ? `Due ${formatDateOnly(props.dueDate)}`
        : "No due date set"
    case "overdue":
      return props.dueDate ? `Was due ${formatDateOnly(props.dueDate)}` : null
    case "client_confirmed":
      return props.proofUploadedAt
        ? formatProofTimestamp(props.proofUploadedAt)
        : "Awaiting your review"
    case "received":
      return props.receivedDate ? formatDateOnly(props.receivedDate) : null
    default:
      return assertNever(props.status)
  }
}

export function PaymentStatusCard(
  props: PaymentStatusCardProps,
): ReactElement {
  const { status, showMotion = true, className } = props
  const theme = getTheme(status)
  const title = getTitle(props)
  const subtitle = getSubtitle(props)

  const reducedMotion = useReducedMotion()
  const motionAllowed = showMotion && !reducedMotion

  // Track previous status for transition detection. The initial value equals
  // the current status so a cold mount with status=client_confirmed does NOT
  // fire the confirmation animation — only pending → client_confirmed does.
  const [previousStatus, setPreviousStatus] = useState<PaymentStatus>(status)
  const [justConfirmed, setJustConfirmed] = useState(false)

  // Adjust state during render when props change (React pattern):
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (previousStatus !== status) {
    setPreviousStatus(status)
    if (
      previousStatus === "pending" &&
      status === "client_confirmed" &&
      motionAllowed
    ) {
      setJustConfirmed(true)
    }
  }

  // Clear the transient flag 600ms after it turns on so the ring unmounts
  // and the next pending → client_confirmed transition re-fires cleanly.
  useEffect(() => {
    if (!justConfirmed) return
    const timer = window.setTimeout(() => setJustConfirmed(false), 600)
    return () => window.clearTimeout(timer)
  }, [justConfirmed])

  const IconComponent = theme.icon

  return (
    <div
      role="status"
      className={cn("relative", className)}
      style={{
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: theme.background,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Icon wrapper — fixed 14x14 so the absolute-positioned ring can use
          inset:0 and be centered over the icon without a width/height
          conflict. marginTop nudges the icon to align with the title text. */}
      <div
        style={{
          position: "relative",
          width: 14,
          height: 14,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {justConfirmed ? (
          <div
            className="pc-checkmark-in"
            style={{ display: "inline-flex", transformOrigin: "center" }}
          >
            <Icon
              name={IconComponent}
              size="sm"
              className="size-3.5"
              style={{ color: theme.color }}
            />
          </div>
        ) : (
          <Icon
            name={IconComponent}
            size="sm"
            className="size-3.5"
            style={{ color: theme.color }}
          />
        )}
        {justConfirmed && (
          <span
            data-testid="status-ring"
            aria-hidden
            className="pc-ring-pulse"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${theme.color}`,
              pointerEvents: "none",
              transformOrigin: "center",
            }}
          />
        )}
      </div>
      <div>
        <p
          className="text-body-sm font-semibold"
          style={{ color: theme.color }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="text-micro opacity-75 mt-0.5"
            style={{ color: theme.color }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
