import React from "react"

interface FitDeskLogoProps {
  size?: "sm" | "lg"
  className?: string
}

export function FitDeskLogo({ size = "lg", className = "" }: FitDeskLogoProps) {
  const isLg = size === "lg"

  const containerSize = isLg ? 64 : 28
  const containerRadius = isLg ? 16 : 7
  const boltW = isLg ? 30 : 13
  const boltH = isLg ? 37 : 16
  const dotSpacing = isLg ? 7 : 5
  const dotRadius = isLg ? 0.7 : 0.6
  const dotCx = isLg ? 1 : 0.8

  const IconBox = (
    <div
      style={{
        width: containerSize,
        height: containerSize,
        borderRadius: containerRadius,
        background: "#0c121e",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.18 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`dots-${size}`}
            x="0"
            y="0"
            width={dotSpacing}
            height={dotSpacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={dotCx} cy={dotCx} r={dotRadius} fill="#22D3EE" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${size})`} />
      </svg>
      <svg
        style={{ position: "relative", zIndex: 1 }}
        width={boltW}
        height={boltH}
        viewBox="0 0 80 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M48 0L0 56H32L16 96L80 32H40L48 0Z" fill="url(#bolt-grad)" />
        <defs>
          <linearGradient id="bolt-grad" x1="40" y1="0" x2="40" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22D3EE" />
            <stop offset="1" stopColor="#0891b2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )

  if (isLg) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        {IconBox}
        <div
          className="text-[22px] font-extrabold"
          style={{ letterSpacing: "-0.04em", color: "white" }}
        >
          Fit<span style={{ color: "#22D3EE" }}>Desk</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-row items-center gap-2 ${className}`}>
      {IconBox}
      <span
        className="text-[17px] font-bold"
        style={{ letterSpacing: "-0.03em", color: "white" }}
      >
        Fit<span style={{ color: "#22D3EE" }}>Desk</span>
      </span>
    </div>
  )
}
