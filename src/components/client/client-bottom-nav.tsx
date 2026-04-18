"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarDays, TrendingUp, Salad } from "lucide-react"
import { Icon } from "@/components/ui/icon"

const ACTIVE_CIRCLE_BG = "rgba(255,255,255,0.09)"

const tabs = [
  { href: "/client", label: "Home", icon: Home, active: "#00C6D4", inactive: "rgba(0,198,212,0.35)" },
  { href: "/client/sessions", label: "Sessions", icon: CalendarDays, active: "#FFB347", inactive: "rgba(255,179,71,0.35)" },
  { href: "/client/progress", label: "Progress", icon: TrendingUp, active: "#00E096", inactive: "rgba(0,224,150,0.35)" },
  { href: "/client/nutrition", label: "Nutrition", icon: Salad, active: "#84CC16", inactive: "rgba(132,204,22,0.35)" },
] as const

export function ClientBottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard, intentional
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
        {tabs.map(({ href, label, icon: IconComponent, active: activeColor, inactive: inactiveColor }) => {
          const isActive = mounted && (
            href === "/client" ? pathname === "/client" : pathname.startsWith(href)
          )

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center py-3"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                style={{
                  background: isActive ? ACTIVE_CIRCLE_BG : "transparent",
                  color: isActive ? activeColor : inactiveColor,
                }}
              >
                <Icon name={IconComponent} size="md" />
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
