"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, DollarSign, BarChart2, Salad, UserCircle } from "lucide-react";

/** Per-tab accent: active = full hue; inactive = same hue, subdued (readable on navy bar). */
const tabs = [
  { href: "/", label: "Home", icon: Home, active: "#00C6D4", inactive: "rgba(0,198,212,0.42)" },
  { href: "/clients", label: "Clients", icon: Users, active: "#00E096", inactive: "rgba(0,224,150,0.38)" },
  { href: "/bookings", label: "Calendar", icon: CalendarDays, active: "#FFB347", inactive: "rgba(255,179,71,0.4)" },
  { href: "/payments", label: "Payments", icon: DollarSign, active: "#FF4C7A", inactive: "rgba(255,76,122,0.4)" },
  { href: "/analytics", label: "Analytics", icon: BarChart2, active: "#8B5CF6", inactive: "rgba(139,92,246,0.45)" },
  { href: "/nutrition", label: "Nutrition", icon: Salad, active: "#84CC16", inactive: "rgba(132,204,22,0.4)" },
  { href: "/profile", label: "Profile", icon: UserCircle, active: "#F1F5F9", inactive: "rgba(241,245,249,0.4)" },
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
  if (rgb) {
    return `drop-shadow(0 0 5px rgba(${rgb.r},${rgb.g},${rgb.b},0.75))`;
  }
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
      }}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map(({ href, label, icon: Icon, active: activeColor, inactive: inactiveColor }) => {
          const isActive = mounted && (
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          );

          const color = isActive ? activeColor : inactiveColor;

          const rgb = hexToRgb(activeColor);
          const barGlow =
            rgb != null
              ? `0 0 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`
              : "0 0 8px rgba(255,255,255,0.5)";

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center py-3 transition-all"
              style={{ gap: "4px" }}
            >
              <div
                style={{
                  width: "20px",
                  height: "2px",
                  borderRadius: "2px",
                  background: activeColor,
                  boxShadow: barGlow,
                  opacity: isActive ? 1 : 0,
                  marginBottom: "2px",
                }}
              />
              <Icon
                style={{
                  width: isActive ? "24px" : "22px",
                  height: isActive ? "24px" : "22px",
                  color,
                  filter: isActive ? glowForActive(activeColor) : "none",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 400,
                  letterSpacing: "0.04em",
                  color,
                  textTransform: "uppercase",
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
