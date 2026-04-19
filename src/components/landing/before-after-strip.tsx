import type { ReactElement } from "react"
import type { LucideIcon } from "lucide-react"
import {
  MessageSquare,
  Receipt,
  Table2,
  Timer,
  Bell,
  LayoutDashboard,
  Link2,
  Wallet,
} from "lucide-react"
import { Icon } from "@/components/ui/icon"

type Row = { icon: LucideIcon; text: string }

const BEFORE_ROWS: readonly Row[] = [
  { icon: MessageSquare, text: "WhatsApp threads for every client update" },
  { icon: Table2, text: "Excel sheets that break the moment you rename a tab" },
  { icon: Receipt, text: "Manual invoicing and pasted payment screenshots" },
  { icon: Timer, text: "Chasing payments for weeks after the session" },
]

const AFTER_ROWS: readonly Row[] = [
  { icon: LayoutDashboard, text: "One app — clients, calendar, and money in one flow" },
  { icon: Bell, text: "Automated reminders so sessions actually show up" },
  { icon: Wallet, text: "Payments tracked (cash, PayNow, bank transfer)" },
  { icon: Link2, text: "Booking link to share — book without the ping-pong" },
]

export function BeforeAfterStrip(): ReactElement {
  return (
    <section
      aria-labelledby="before-after-heading"
      className="mx-auto max-w-6xl px-6 py-12 md:py-16"
    >
      <h2
        id="before-after-heading"
        className="text-2xl md:text-3xl font-semibold tracking-tight text-center max-w-2xl mx-auto"
      >
        Stop juggling five tools between sessions.
      </h2>
      <p className="text-body-lg text-muted-foreground text-center mt-3 max-w-xl mx-auto">
        Same work, less chaos — here is what changes when FitDesk is in your
        pocket.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 card-border-pink">
          <p className="label-upper mb-4">Before FitDesk</p>
          <ul className="space-y-4">
            {BEFORE_ROWS.map((row) => (
              <li key={row.text} className="flex gap-3">
                <span className="mt-0.5 shrink-0 av-pink inline-flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon name={row.icon} size="md" aria-hidden />
                </span>
                <span className="text-body-sm text-muted-foreground pt-1">
                  {row.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 card-border-green">
          <p className="label-upper mb-4">With FitDesk</p>
          <ul className="space-y-4">
            {AFTER_ROWS.map((row) => (
              <li key={row.text} className="flex gap-3">
                <span className="mt-0.5 shrink-0 av-green inline-flex h-9 w-9 items-center justify-center rounded-xl">
                  <Icon name={row.icon} size="md" aria-hidden />
                </span>
                <span className="text-body-sm text-muted-foreground pt-1">
                  {row.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
