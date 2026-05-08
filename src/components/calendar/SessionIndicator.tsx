"use client"

export interface SessionIndicatorProps {
  confirmed: number
  pending: number
  variant: "month" | "week"
}

/**
 * SessionIndicator
 * Compact dot + count badge used in MonthCell and WeekStrip.
 * Returns null when there are no sessions to display.
 */
export function SessionIndicator({ confirmed, pending, variant }: SessionIndicatorProps) {
  const total = confirmed + pending
  if (total === 0) return null

  const color = confirmed > 0 ? "#00C6D4" : "#FFB347"

  // month: 4px dot, text-[10px]; week: 6px dot, text-micro
  const dotSize = variant === "month" ? 4 : 6
  const fontSize = variant === "month" ? "10px" : undefined

  return (
    <div className="flex items-center gap-0.5">
      <span
        className="rounded-full"
        style={{
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          background: color,
        }}
      />
      <span
        className={variant === "week" ? "text-micro" : undefined}
        style={{ color, fontSize }}
      >
        {total}
      </span>
    </div>
  )
}
