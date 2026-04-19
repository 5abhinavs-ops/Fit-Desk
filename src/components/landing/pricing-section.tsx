import type { ReactElement } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"

const FREE_POINTS = [
  "Up to 3 clients, forever",
  "Core client + session workflows",
  "WhatsApp reminders and payment tracking",
] as const

const PRO_POINTS = [
  "Unlimited clients",
  "Everything in Free, without caps",
  "Built for solo PTs who are outgrowing spreadsheets",
] as const

export function PricingSection(): ReactElement {
  return (
    <section
      aria-labelledby="pricing-heading"
      className="mx-auto max-w-6xl px-6 py-12 md:py-20"
    >
      <h2
        id="pricing-heading"
        className="text-3xl md:text-4xl font-semibold tracking-tight text-center max-w-2xl mx-auto"
      >
        Simple pricing. No surprises.
      </h2>
      <p className="text-body-lg text-muted-foreground text-center mt-4 max-w-xl mx-auto">
        Start free, upgrade when your roster grows past three clients.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col card-border-cyan">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-display-sm font-semibold">Free</h3>
            <span className="text-body-sm text-muted-foreground tabular">
              $0
            </span>
          </div>
          <p className="text-body-sm text-muted-foreground mt-2">
            3 clients forever — every core feature unlocked so you can feel the
            product before you pay.
          </p>
          <ul className="mt-6 space-y-3 flex-1">
            {FREE_POINTS.map((line) => (
              <li key={line} className="flex gap-2 text-body-sm">
                <span className="mt-0.5 text-fd-green shrink-0">
                  <Icon name={Check} size="sm" aria-hidden />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/signup" className="block">
              <Button size="lg" variant="outline" className="w-full">
                Start on Free
              </Button>
            </Link>
          </div>
        </div>

        <div
          className="rounded-2xl border border-border px-8 pt-8 pb-8 flex flex-col relative overflow-hidden card-accent-top"
          style={{
            background:
              "linear-gradient(160deg, rgba(0,198,212,0.12), rgba(0,224,150,0.06))",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-display-sm font-semibold">Pro</h3>
              <p className="text-body-sm text-muted-foreground mt-2">
                Unlimited clients and room to grow your roster without
                friction.
              </p>
            </div>
            <span className="badge-pro shrink-0">Popular</span>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular">
            $19
            <span className="text-body-lg font-normal text-muted-foreground">
              /month
            </span>
          </p>
          <ul className="mt-6 space-y-3 flex-1">
            {PRO_POINTS.map((line) => (
              <li key={line} className="flex gap-2 text-body-sm">
                <span className="mt-0.5 text-fd-cyan shrink-0">
                  <Icon name={Check} size="sm" aria-hidden />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link href="/signup" className="block">
              <Button size="lg" className="w-full">
                Start free, upgrade anytime
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
