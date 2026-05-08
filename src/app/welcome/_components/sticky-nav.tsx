"use client"

import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StickyNav() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50",
        "bg-gradient-to-b from-background/95 to-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        scrolled ? "border-b border-border/60" : "border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/welcome"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold tracking-tight text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <span className="text-xs font-bold">FD</span>
          </span>
          <span>FitDesk</span>
        </Link>

        <Link
          href="/login"
          className={cn(buttonVariants({ size: "sm" }), "h-9 px-4")}
        >
          Start Free
        </Link>
      </div>
    </header>
  )
}
