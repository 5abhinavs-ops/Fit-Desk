"use client"

import * as React from "react"

type PainPoint = {
  id: string
  icon: React.ReactNode
  text: string
}

export function PainPoints({ items }: { items: PainPoint[] }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (prefersReduced) {
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-pp]"))) {
        el.dataset.inview = "true"
      }
      return
    }

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-pp]"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.dataset.inview = "true"
          io.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )

    for (const card of cards) io.observe(card)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={containerRef}>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            data-pp
            data-inview="false"
            style={{ transitionDelay: `${idx * 100}ms` }}
            className={[
              "rounded-2xl border border-border/60 bg-card/60 p-4",
              "flex items-start gap-3",
              "opacity-0 translate-y-3",
              "transition-[opacity,transform] duration-500 ease-out",
              "data-[inview=true]:opacity-100 data-[inview=true]:translate-y-0",
              "motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:transition-none",
            ].join(" ")}
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</div>
            <p className="text-sm leading-relaxed text-foreground/90">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
