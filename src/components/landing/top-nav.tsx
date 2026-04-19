import type { ReactElement } from "react"
import Link from "next/link"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"

export function TopNav(): ReactElement {
  return (
    <nav className="h-16 border-b border-border">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Link href="/welcome" aria-label="FitDesk home">
          <FitDeskLogo size="sm" />
        </Link>
        <Link
          href="/login"
          className="text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </div>
    </nav>
  )
}
