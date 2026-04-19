"use client"

import { useEffect, useRef, useState, type ReactElement } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export interface AnimatedNumberProps {
  value: number
  // Optional starting value used on first mount. When `from !== value` and
  // motion is allowed, the component tweens from `from` to `value` once.
  // Ignored under reduced-motion.
  from?: number
  // Tween duration in ms. Default 400.
  duration?: number
  className?: string
}

function computeInitial(
  value: number,
  from: number | undefined,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return value
  if (from === undefined || from === value) return value
  return from
}

export function AnimatedNumber({
  value,
  from,
  duration = 400,
  className,
}: AnimatedNumberProps): ReactElement {
  const reducedMotion = useReducedMotion()
  const [displayed, setDisplayed] = useState<number>(() =>
    computeInitial(value, from, reducedMotion),
  )

  // Mirror the current `displayed` value into a ref so the tween effect can
  // snapshot it as the start-of-tween value without depending on `displayed`
  // (which would retrigger the effect on every frame).
  const displayedRef = useRef(displayed)
  useEffect(() => {
    displayedRef.current = displayed
  }, [displayed])

  // Under reduced motion, snap displayed to value during render. This uses
  // React's "adjust state during render" pattern — the re-render is batched
  // and does not trigger cascading effects.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (reducedMotion && displayed !== value) {
    setDisplayed(value)
  }

  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // Reduced-motion path is handled during render; skip the tween entirely.
    if (reducedMotion) return

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const start = displayedRef.current
    if (start === value) return

    // Clamp duration to ≥1ms. Zero or negative duration would make the first
    // rAF tick compute progress as Infinity (clamped to 1) or as a negative
    // value that never reaches 1 — the clamp makes both edge cases snap on
    // the first frame instead.
    const safeDuration = Math.max(1, duration)
    const startTime = performance.now()

    function tick(now: number): void {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / safeDuration, 1)
      const next = Math.round(start + (value - start) * progress)
      setDisplayed(next)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [value, duration, reducedMotion])

  // aria-label holds the target value so screen readers read the final number
  // regardless of what the visual tween currently shows. This avoids SR
  // announcing every intermediate integer during a 400ms tween.
  return (
    <span className={className} aria-label={String(value)}>
      {displayed}
    </span>
  )
}
