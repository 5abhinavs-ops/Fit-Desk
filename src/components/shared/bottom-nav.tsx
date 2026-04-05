"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, DollarSign, BarChart2, Salad, UserCircle } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/bookings", label: "Calendar", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/nutrition", label: "Nutrition", icon: Salad },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const;

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
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = mounted && (
            href === "/" ? pathname === "/" : pathname.startsWith(href)
          );

          const activeColor = "#00C6D4";
          const inactiveColor = "#4A6A85";
          const color = isActive ? activeColor : inactiveColor;

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center py-3 transition-all"
              style={{ gap: "4px" }}
            >
              {/* Top indicator bar — always rendered, opacity toggles */}
              <div style={{
                width: "20px",
                height: "2px",
                borderRadius: "2px",
                background: activeColor,
                boxShadow: "0 0 8px rgba(0,198,212,0.8)",
                opacity: isActive ? 1 : 0,
                marginBottom: "2px",
              }} />
              <Icon
                style={{
                  width: isActive ? "24px" : "22px",
                  height: isActive ? "24px" : "22px",
                  color,
                  filter: isActive ? "drop-shadow(0 0 4px rgba(0,198,212,0.5))" : "none",
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
