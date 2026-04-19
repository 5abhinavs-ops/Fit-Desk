import type { ReactElement } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function BottomCta(): ReactElement {
  return (
    <section
      aria-labelledby="bottom-cta-heading"
      className="mx-auto max-w-4xl px-6 py-16 md:py-24"
    >
      {/*
        Border uses the `border-border` token (resolves to the same
        rgba(0,198,212,0.18) defined in globals.css). The gradient stays inline
        because Tailwind utilities don't compose two-stop linear gradients with
        per-stop alpha cleanly, and this is a single-use surface — no token
        drift risk worth a dedicated globals.css utility.
      */}
      <div
        className="rounded-3xl border border-border px-6 py-12 md:px-12 md:py-16 text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,198,212,0.10), rgba(0,224,150,0.06))",
        }}
      >
        <h2
          id="bottom-cta-heading"
          className="text-3xl md:text-4xl font-semibold tracking-tight"
        >
          Free for your first 3 clients.
        </h2>
        <p className="text-body-lg text-muted-foreground mt-4 max-w-xl mx-auto">
          No credit card. No trial timer. Try every feature, forever — upgrade
          only when you outgrow the free tier.
        </p>
        <div className="mt-8">
          <Link href="/signup">
            <Button size="lg" className="btn-gradient">
              Start free — 3 clients
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
