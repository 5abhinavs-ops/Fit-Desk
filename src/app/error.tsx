"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RotateCcw, Home, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--fd-surface-hi)] ring-1 ring-[color:var(--fd-border)]">
            <Icon name={AlertTriangle} size="lg" className="text-[color:var(--fd-cyan)]" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We ran into an unexpected error. Our team has been notified.
            You can try again or head back to the dashboard.
          </p>
          {error.digest ? (
            <p className="pt-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Ref {error.digest}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full" type="button">
            <Icon name={RotateCcw} size="sm" className="mr-2" />
            Try again
          </Button>
          <Link
            href="/"
            className={cn(
              "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,198,212,0.18)] bg-[color:var(--fd-surface-hi)] px-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--fd-surface-hi)]/80",
            )}
          >
            <Icon name={Home} size="sm" className="mr-2" />
            Go home
          </Link>
        </div>

        <p className="pt-2 text-xs text-muted-foreground">
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
