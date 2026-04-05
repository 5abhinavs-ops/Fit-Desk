"use client";

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
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-3 transition-all"
              style={{ minWidth: 0 }}
            >
              {/* Active tab gets a cyan glow dot above the icon */}
              {isActive && (
                <div style={{
                  width: "20px",
                  height: "2px",
                  borderRadius: "2px",
                  background: "#00C6D4",
                  marginBottom: "4px",
                  boxShadow: "0 0 8px rgba(0,198,212,0.8)",
                }} />
              )}
              <Icon
                style={{
                  width: isActive ? "26px" : "22px",
                  height: isActive ? "26px" : "22px",
                  color: isActive ? "#00C6D4" : "#4A6A85",
                  filter: isActive ? "drop-shadow(0 0 6px rgba(0,198,212,0.6))" : "none",
                  transition: "all 0.2s",
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 800 : 400,
                  letterSpacing: "0.04em",
                  color: isActive ? "#00C6D4" : "#4A6A85",
                  marginTop: "2px",
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
