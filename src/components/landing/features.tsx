import type { ReactElement } from "react"
import { MessageCircle, Users, Wallet, type LucideIcon } from "lucide-react"
import { Icon } from "@/components/ui/icon"

type Accent = "cyan" | "green" | "amber"

interface Feature {
  icon: LucideIcon
  title: string
  body: string
  accent: Accent
  // Per-card stagger so the row doesn't pop in as one block. Reduced-motion
  // users skip animation entirely (motion-safe variant gates the whole class).
  delayMs: number
}

const FEATURES: readonly Feature[] = [
  {
    icon: Users,
    title: "Clients in one place",
    body: "Add a client in seconds. Track goals, injuries, packages, and last session at a glance — no more scrolling WhatsApp threads.",
    accent: "cyan",
    delayMs: 0,
  },
  {
    icon: MessageCircle,
    title: "Sessions on autopilot",
    body: "WhatsApp reminders fire 24h and 1h before every session. Cuts no-shows in half so you stop training empty rooms.",
    accent: "green",
    delayMs: 150,
  },
  {
    icon: Wallet,
    title: "Get paid faster",
    body: "Cash, PayNow, and bank transfer all tracked natively. Auto-chasers go out on day 1, day 3, and day 7 — without the awkward late-night ping.",
    accent: "amber",
    delayMs: 300,
  },
]

const ACCENT_BORDER: Record<Accent, string> = {
  cyan: "card-border-cyan",
  green: "card-border-green",
  amber: "card-border-amber",
}

// Reuse the existing avatar-tint utilities from globals.css. They already
// pair a ~14% bg tint with the matching brand-colour text — exactly what the
// icon chip needs, and ties this page to the same token layer the rest of the
// app uses for accented surfaces.
const ACCENT_TINT: Record<Accent, string> = {
  cyan: "av-cyan",
  green: "av-green",
  amber: "av-amber",
}

export function Features(): ReactElement {
  return (
    <section
      aria-labelledby="features-heading"
      className="mx-auto max-w-6xl px-6 py-12 md:py-20"
    >
      <h2
        id="features-heading"
        className="text-3xl md:text-4xl font-semibold tracking-tight text-center max-w-2xl mx-auto"
      >
        Built for the way you actually work.
      </h2>
      <p className="text-body-lg text-muted-foreground text-center mt-4 max-w-xl mx-auto">
        FitDesk handles the busywork between sessions so you can focus on
        training.
      </p>

      <ul className="grid gap-6 md:grid-cols-3 mt-12">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            style={
              feature.delayMs > 0
                ? { animationDelay: `${feature.delayMs}ms` }
                : undefined
            }
            className={`rounded-2xl bg-card p-6 ${ACCENT_BORDER[feature.accent]} motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:fill-mode-both`}
          >
            <div
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${ACCENT_TINT[feature.accent]}`}
            >
              <Icon name={feature.icon} size="md" />
            </div>
            <h3 className="text-display-sm font-semibold">{feature.title}</h3>
            <p className="text-body-sm text-muted-foreground mt-2">
              {feature.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
