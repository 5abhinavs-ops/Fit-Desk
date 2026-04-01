import type { ReactNode } from "react";
import { BottomNav } from "@/components/shared/bottom-nav";
import { ErrorBoundary } from "@/components/error-boundary";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-screen pb-20">
      <main className="mx-auto max-w-lg px-4 py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  );
}
