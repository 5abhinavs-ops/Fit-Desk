"use client"

import type { ReactElement } from "react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export interface ShimmerOverlayProps {
  // Merged onto the outer element. Callers typically pass
  // `absolute inset-0 pointer-events-none` when overlaying an image.
  className?: string
}

// A moving top-to-bottom gradient for pending/loading states (e.g., AI scan).
// Returns null under reduced-motion so no shimmer element mounts at all —
// callers do not need to guard at call sites.
export function ShimmerOverlay({
  className,
}: ShimmerOverlayProps): ReactElement | null {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return null

  // Two-element structure: the outer div is the stationary clip container,
  // the inner div carries the gradient and the CSS keyframe y-translate.
  // Splitting them is required — a single element that is BOTH the clip
  // container AND the translated target just slides its own bounding box
  // out of view, so the sweep effect is invisible.
  return (
    <div
      data-testid="shimmer-overlay"
      aria-hidden
      className={cn("overflow-hidden", className)}
    >
      <div
        className="shimmer-sweep h-full w-full"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
        }}
      />
    </div>
  )
}
