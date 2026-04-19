import type { ReactElement } from "react"

export function Footer(): ReactElement {
  // Intentional: on a statically rendered marketing page this evaluates at
  // build time and freezes until the next deploy. That's acceptable for a
  // copyright line and avoids a client-side hydration cost.
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="text-micro text-muted-foreground text-center">
          © {year} FitDesk. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
