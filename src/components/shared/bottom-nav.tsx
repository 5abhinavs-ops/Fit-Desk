"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, DollarSign, UserCircle } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home, active: "#00C6D4", inactive: "rgba(0,198,212,0.38)" },
  { href: "/clients", label: "Clients", icon: Users, active: "#00E096", inactive: "rgba(0,224,150,0.32)" },
  { href: "/bookings", label: "Calendar", icon: CalendarDays, active: "#FFB347", inactive: "rgba(255,179,71,0.35)" },
  { href: "/payments", label: "Payments", icon: DollarSign, active: "#FF4C7A", inactive: "rgba(255,76,122,0.35)" },
  { href: "/profile", label: "Profile", icon: UserCircle, active: "#F1F5F9", inactive: "rgba(241,245,249,0.35)" },
] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (hex.startsWith("#") && hex.length === 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }
  return null;
}

function glowForActive(color: string): string {
  const rgb = hexToRgb(color);
  if (rgb) return `drop-shadow(0 0 6px rgba(${rgb.r},${rgb.g},${rgb.b},0.8))`;
  return "drop-shadow(0 0 4px rgba(255,255,255,0.35))";
}

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
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
        {tabs.map(({ href, label, icon: Icon, active: activeColor, inactive: inactiveColor }) => {
          const isActive = mounted && (
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          );

          const color = isActive ? activeColor : inactiveColor;
          const rgb = hexToRgb(activeColor);
          const barGlow = rgb != null
            ? `0 0 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`
            : "0 0 8px rgba(255,255,255,0.5)";

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-1 flex-col items-center py-2 transition-all"
              style={{ gap: "2px" }}
            >
              {/* Active indicator bar */}
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
              {/* Icon — larger when active */}
              <Icon
                style={{
                  width: isActive ? "26px" : "23px",
                  height: isActive ? "26px" : "23px",
                  color,
                  filter: isActive ? glowForActive(activeColor) : "none",
                  transition: "all 0.15s ease",
                }}
              />
              {/* Text label */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 600 : 400,
                  color: color,
                  letterSpacing: "0.02em",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
