"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarDays, TrendingUp, Salad } from "lucide-react"

const tabs = [
  { href: "/client", label: "Home", icon: Home, active: "#00C6D4", inactive: "rgba(0,198,212,0.35)" },
  { href: "/client/sessions", label: "Sessions", icon: CalendarDays, active: "#FFB347", inactive: "rgba(255,179,71,0.35)" },
  { href: "/client/progress", label: "Progress", icon: TrendingUp, active: "#00E096", inactive: "rgba(0,224,150,0.35)" },
  { href: "/client/nutrition", label: "Nutrition", icon: Salad, active: "#84CC16", inactive: "rgba(132,204,22,0.35)" },
] as const

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (hex.startsWith("#") && hex.length === 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    }
  }
  return null
}

function glowForActive(color: string): string {
  const rgb = hexToRgb(color)
  if (rgb) return `drop-shadow(0 0 6px rgba(${rgb.r},${rgb.g},${rgb.b},0.8))`
  return "drop-shadow(0 0 4px rgba(255,255,255,0.35))"
}

export function ClientBottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "#12263A",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, label, icon: Icon, active: activeColor, inactive: inactiveColor }) => {
          const isActive = mounted && (
            href === "/client" ? pathname === "/client" : pathname.startsWith(href)
          )

          const color = isActive ? activeColor : inactiveColor
          const rgb = hexToRgb(activeColor)
          const barGlow = rgb != null
            ? `0 0 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`
            : "0 0 8px rgba(255,255,255,0.5)"

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-1 flex-col items-center py-3 transition-all"
            >
              <div
                style={{
                  width: "20px",
                  height: "2px",
                  borderRadius: "2px",
                  background: activeColor,
                  boxShadow: barGlow,
                  opacity: isActive ? 1 : 0,
                  marginBottom: "1px",
                }}
              />
              <Icon
                style={{
                  width: isActive ? "26px" : "23px",
                  height: isActive ? "26px" : "23px",
                  color,
                  filter: isActive ? glowForActive(activeColor) : "none",
                  transition: "all 0.15s ease",
                }}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
