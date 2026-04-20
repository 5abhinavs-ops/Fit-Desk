import type { ReactElement } from "react"
import {
  Calendar,
  DollarSign,
  Home,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Icon } from "@/components/ui/icon"

// TODO: swap this CSS composition with
// <Image src="/marketing/hero-mockup.png" width={320} height={676} priority
//        alt="FitDesk dashboard on iPhone" />
// once the real device-framed screenshot is produced.

interface NavItem {
  icon: LucideIcon
  label: string
  active?: boolean
}

const BOTTOM_NAV: readonly NavItem[] = [
  { icon: Home, label: "Home", active: true },
  { icon: Users, label: "Clients" },
  { icon: Calendar, label: "Calendar" },
  { icon: DollarSign, label: "Payments" },
]

export function PhoneMockup(): ReactElement {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] aspect-[9/19] rounded-[2.5rem] border-8 border-[rgba(255,255,255,0.06)] bg-background shadow-2xl shadow-[rgba(0,198,212,0.2)]"
    >
      {/* Inner screen */}
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3 pb-1">
          <span className="text-micro font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 pt-3 pb-2 space-y-3 overflow-hidden">
          <div>
            <p className="text-body-lg font-semibold">Good morning, Alex</p>
            <p className="text-micro text-muted-foreground">
              Monday, 20 Apr
            </p>
          </div>

          {/* Today's sessions card */}
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              background: "rgba(0,198,212,0.08)",
              border: "1px solid rgba(0,198,212,0.18)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <Icon
                name={Calendar}
                size="sm"
                className="size-3.5"
                style={{ color: "var(--fd-cyan)" }}
              />
              <span
                className="text-micro font-semibold uppercase tracking-wider"
                style={{ color: "var(--fd-cyan)" }}
              >
                Today
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Priya S.</span>
                <span className="text-micro text-muted-foreground tabular">
                  7:00 AM
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-medium">Marcus L.</span>
                <span className="text-micro text-muted-foreground tabular">
                  10:30 AM
                </span>
              </div>
            </div>
          </div>

          {/* Outstanding card */}
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(255,179,71,0.08)",
              border: "1px solid rgba(255,179,71,0.18)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon
                name={DollarSign}
                size="sm"
                className="size-3.5"
                style={{ color: "var(--fd-amber)" }}
              />
              <span
                className="text-micro font-semibold uppercase tracking-wider"
                style={{ color: "var(--fd-amber)" }}
              >
                Outstanding
              </span>
            </div>
            <p
              className="text-body-lg font-semibold tabular"
              style={{ color: "var(--fd-amber)" }}
            >
              $240
            </p>
            <p className="text-micro text-muted-foreground">
              from 3 clients
            </p>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="border-t border-border flex items-center justify-around py-2">
          {BOTTOM_NAV.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-0.5"
            >
              <Icon
                name={item.icon}
                size="sm"
                className={item.active ? "" : "text-muted-foreground"}
                style={item.active ? { color: "var(--fd-cyan)" } : undefined}
              />
              {/*
                text-[9px] is a documented exception. text-micro (12px)
                would overflow the 280px-wide simulated device frame at
                this typographic weight; 9px matches iOS bottom-nav
                visual density. Keep arbitrary value inside the mockup.
              */}
              <span
                className={`text-[9px] font-medium ${item.active ? "" : "text-muted-foreground"}`}
                style={item.active ? { color: "var(--fd-cyan)" } : undefined}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
