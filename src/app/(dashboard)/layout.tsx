import type { ReactNode } from "react";
import { BottomNav } from "@/components/shared/bottom-nav";
import { ErrorBoundary } from "@/components/error-boundary";
import { Mail } from "lucide-react";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-screen pb-20 md:bg-gradient-to-b md:from-[#0A1826] md:via-[#0D1B2A] md:to-[#0A1826]">
      <main className="mx-auto max-w-lg px-4 py-6 md:my-8 md:rounded-2xl md:bg-background md:shadow-[0_8px_40px_rgba(0,0,0,0.35)] md:ring-1 md:ring-[rgba(0,198,212,0.08)]">
        <ErrorBoundary>{children}</ErrorBoundary>
        <footer className="mt-8 border-t border-border pt-4">
          <a
            href="mailto:support@fitdesk.pro"
            className="flex items-center justify-center gap-1.5 text-micro text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon name={Mail} size="sm" />
            Need help? support@fitdesk.pro
          </a>
        </footer>
      </main>
      <BottomNav />
    </div>
  );
}
