import * as React from "react"

import { cn } from "@/lib/utils"

export function PhoneMockup({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[360px]", className)}>
      <div className="relative overflow-hidden rounded-[2.25rem] border border-border/60 bg-gradient-to-b from-background to-card shadow-[0_20px_80px_-40px_hsl(var(--foreground)/0.35)]">
        <div className="mx-auto h-7 w-36 rounded-b-2xl bg-background/70" />
        <div className="px-4 pb-4 pt-3">
          {(title || subtitle) && (
            <div className="mb-3">
              {title ? (
                <div className="text-xs font-semibold tracking-tight text-foreground">
                  {title}
                </div>
              ) : null}
              {subtitle ? (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {subtitle}
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-3">{children}</div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />
      </div>
    </div>
  )
}

export function MockCard({
  label,
  value,
  tone = "primary",
}: {
  label: string
  value: string
  tone?: "primary" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-[color:var(--fd-green)]"
      : tone === "warning"
        ? "text-[color:var(--fd-amber)]"
        : tone === "danger"
          ? "text-[color:var(--fd-pink)]"
          : "text-primary"

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-1 text-xl font-bold tabular", toneClass)}>
        {value}
      </div>
    </div>
  )
}

export function StatusPill({
  text,
  tone,
}: {
  text: string
  tone: "success" | "warning" | "danger"
}) {
  const cls =
    tone === "success"
      ? "bg-[color:var(--fd-green)]/15 text-[color:var(--fd-green)] border-[color:var(--fd-green)]/25"
      : tone === "warning"
        ? "bg-[color:var(--fd-amber)]/15 text-[color:var(--fd-amber)] border-[color:var(--fd-amber)]/25"
        : "bg-[color:var(--fd-pink)]/15 text-[color:var(--fd-pink)] border-[color:var(--fd-pink)]/25"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        cls
      )}
    >
      {text}
    </span>
  )
}

export function MiniRow({
  left,
  right,
}: {
  left: React.ReactNode
  right: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
      <div className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        {left}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}
