import type { ReactElement } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PhoneMockup } from "@/components/landing/phone-mockup"

// Animation: Tailwind motion-safe: variants compile to
// @media (prefers-reduced-motion: no-preference), so reduced-motion users
// see the copy and mockup in their final state with no fade/slide applied.
// `tw-animate-css` (package.json) provides the animate-in / fade-in-0 /
// slide-in-from-bottom-4 utilities. No JS animation library required.

export function Hero(): ReactElement {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-24 lg:py-28">
      <div className="grid items-center gap-12 md:grid-cols-2">
        {/* Copy stack */}
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 space-y-6">
          {/*
            Headline uses raw text-4xl/text-5xl because Phase A's
            text-display-sm (20px) is a UI display token, not a marketing
            hero size. Documented exception; no token swap needed.
          */}
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Run your training business from your phone.
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-xl">
            FitDesk replaces your WhatsApp threads, Excel sheets, and invoicing
            app. Manage clients, sessions, and payments in one place.
          </p>
          <div>
            <Link href="/signup">
              <Button size="lg" className="btn-gradient">
                Start free — 3 clients
              </Button>
            </Link>
            <p className="text-micro text-muted-foreground mt-3">
              No credit card. Free for your first 3 clients, forever.
            </p>
          </div>
        </div>

        {/* Phone mockup — staggered fade-in */}
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-1000 motion-safe:delay-150">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
