"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, DollarSign, UserCircle } from "lucide-react";
import { Icon } from "@/components/ui/icon";

const ACTIVE_CIRCLE_BG = "rgba(255,255,255,0.09)";

const tabs = [
  { href: "/", label: "Home", icon: Home, active: "#00C6D4", inactive: "rgba(0,198,212,0.38)" },
  { href: "/clients", label: "Clients", icon: Users, active: "#00E096", inactive: "rgba(0,224,150,0.32)" },
  { href: "/bookings", label: "Calendar", icon: CalendarDays, active: "#FFB347", inactive: "rgba(255,179,71,0.35)" },
  { href: "/payments", label: "Payments", icon: DollarSign, active: "#FF4C7A", inactive: "rgba(255,76,122,0.35)" },
  { href: "/profile", label: "Profile", icon: UserCircle, active: "#F1F5F9", inactive: "rgba(241,245,249,0.35)" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard, intentional
  useEffect(() => setMounted(true), []);

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
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          );

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
          );
        })}
      </div>
    </nav>
  );
}
