import React from "react"

interface FitDeskLogoProps {
  size?: "sm" | "lg"
  className?: string
}

/**
 * In-app FitDesk wordmark. Mirrors the design of /public/logo.svg but renders
 * inline so we can react to theme/state without a network round-trip. Colours
 * are driven by CSS variables (--fd-logo-*) so a rebrand touches one file.
 */
export function FitDeskLogo({ size = "lg", className = "" }: FitDeskLogoProps) {
  const isLg = size === "lg"
  const boxId = `fd-logo-${size}`
  const containerPx = isLg ? 64 : 28
  const containerRadiusPx = isLg ? 16 : 7
  const boltW = isLg ? 30 : 13
  const boltH = isLg ? 37 : 16
  const dotSpacing = isLg ? 7 : 5
  const dotRadius = isLg ? 0.7 : 0.6
  const dotCx = isLg ? 1 : 0.8

  const IconBox = (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden border border-white/5"
      style={{
        width: containerPx,
        height: containerPx,
        borderRadius: containerRadiusPx,
        background: "var(--fd-logo-bg)",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <pattern
            id={`dots-${boxId}`}
            x="0"
            y="0"
            width={dotSpacing}
            height={dotSpacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={dotCx} cy={dotCx} r={dotRadius} fill="var(--fd-logo-accent)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${boxId})`} />
      </svg>
      <svg
        className="relative z-[1]"
        width={boltW}
        height={boltH}
        viewBox="0 0 80 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M48 0L0 56H32L16 96L80 32H40L48 0Z" fill={`url(#bolt-${boxId})`} />
        <defs>
          <linearGradient id={`bolt-${boxId}`} x1="40" y1="0" x2="40" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--fd-logo-accent)" />
            <stop offset="1" stopColor="var(--fd-logo-accent-to)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  if (isLg) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {IconBox}
        <div className="text-[22px] font-extrabold tracking-[-0.04em] text-white">
          Fit<span className="text-[color:var(--fd-logo-accent)]">Desk</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-row items-center gap-2 ${className}`}>
      {IconBox}
      <span className="text-[17px] font-bold tracking-[-0.03em] text-white">
        Fit<span className="text-[color:var(--fd-logo-accent)]">Desk</span>
      </span>
    </div>
  )
}
