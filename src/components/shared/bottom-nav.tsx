"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, CalendarDays, DollarSign, BarChart2, Salad, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
        borderTop: "1px solid rgba(255,255,255,0.06)",
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
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors",
                isActive
                  ? "text-[#00C6D4]"
                  : "text-[#7A9BB5] hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span style={{ fontSize: "9px", letterSpacing: "0.03em" }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
