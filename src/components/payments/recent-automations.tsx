"use client"

import { CheckCircle2, ShieldOff, XCircle } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { useWhatsappLogs } from "@/hooks/useWhatsappLogs"
import { getTemplateLabel } from "@/lib/whatsapp-template-labels"
import { cn } from "@/lib/utils"

// SGT formatter — no new deps; Intl handles the timezone offset natively.
const SGT_FORMATTER = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Singapore",
})

function formatSentAtSGT(iso: string): string {
  try {
    return SGT_FORMATTER.format(new Date(iso))
  } catch {
    return iso
  }
}

export function RecentAutomations() {
  const { data, isLoading, isError } = useWhatsappLogs()
  const rows = data ?? []

  return (
    <details className="bg-card rounded-lg border p-3 text-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-2 select-none">
        <span className="font-semibold">Recent automations</span>
        <span className="text-muted-foreground text-body-sm">
          {isLoading ? "…" : `${rows.length} sent`}
        </span>
      </summary>

      <div className="mt-3 space-y-2">
        {isError && (
          <p className="text-muted-foreground text-body-sm">
            Could not load automation history.
          </p>
        )}

        {!isError && !isLoading && rows.length === 0 && (
          <p className="text-muted-foreground text-body-sm">
            No WhatsApp messages sent yet. Reminders and booking confirmations
            will show up here.
          </p>
        )}

        {rows.map((row) => {
          const who = row.client_name ?? "you"
          const label = getTemplateLabel(row.template_name)
          const when = formatSentAtSGT(row.sent_at)
          const { icon, tint, prefix } = statusMeta(row.status)
          return (
            <div
              key={row.id}
              className="flex items-start gap-2 py-1 text-body-sm"
            >
              <Icon
                name={icon}
                size="sm"
                className={cn("mt-0.5 shrink-0", tint)}
              />
              <p className="flex-1">
                <span className={cn("font-medium", tint)}>{prefix}</span> to{" "}
                {who} — {label} —{" "}
                <span className="text-muted-foreground">{when}</span>
              </p>
            </div>
          )
        })}
      </div>
    </details>
  )
}

function statusMeta(status: "sent" | "suppressed_opt_out" | "failed") {
  if (status === "sent") {
    return {
      icon: CheckCircle2,
      tint: "text-[#00E096]",
      prefix: "✓ Sent",
    }
  }
  if (status === "suppressed_opt_out") {
    return {
      icon: ShieldOff,
      tint: "text-[#FFB347]",
      prefix: "⏸ Suppressed (opt-out)",
    }
  }
  return {
    icon: XCircle,
    tint: "text-[#FF4C7A]",
    prefix: "✗ Failed",
  }
}
