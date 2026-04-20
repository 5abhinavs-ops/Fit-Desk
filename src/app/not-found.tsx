import type { Metadata } from "next"
import Link from "next/link"
import { Compass, Home, Mail } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Page not found — FitDesk",
  description: "The page you are looking for does not exist or has moved.",
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--fd-surface-hi)] ring-1 ring-[color:var(--fd-border)]">
            <Icon name={Compass} size="lg" className="text-[color:var(--fd-cyan)]" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--fd-cyan)]">
            404
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The page you are looking for does not exist, or the link may have
            changed. Let&apos;s get you back to where you need to be.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className={cn(
              "btn-gradient inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors",
            )}
          >
            <Icon name={Home} size="sm" className="mr-2" />
            Go home
          </Link>
          <Link
            href="/login"
            className={cn(
              "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,198,212,0.18)] bg-[color:var(--fd-surface-hi)] px-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--fd-surface-hi)]/80",
            )}
          >
            Sign in
          </Link>
        </div>

        <p className="pt-2 text-xs text-muted-foreground">
          Stuck? Email{" "}
          <a
            href="mailto:support@fitdesk.pro"
            className="inline-flex items-center gap-1 text-[color:var(--fd-cyan)] underline-offset-4 hover:underline"
          >
            <Icon name={Mail} size="sm" />
            support@fitdesk.pro
          </a>
        </p>
      </div>
    </div>
  )
}
