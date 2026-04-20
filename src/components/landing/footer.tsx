import type { ReactElement } from "react"
import Link from "next/link"

export function Footer(): ReactElement {
  // Intentional: on a statically rendered marketing page this evaluates at
  // build time and freezes until the next deploy. That's acceptable for a
  // copyright line and avoids a client-side hydration cost.
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col items-center gap-3">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-micro">
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Privacy
          </Link>
          <a
            href="mailto:support@fitdesk.pro"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Contact support
          </a>
        </nav>
        <p className="text-micro text-muted-foreground text-center">
          © {year} FitDesk. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
