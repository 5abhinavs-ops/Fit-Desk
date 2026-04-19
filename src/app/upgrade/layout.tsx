import type { ReactNode } from "react"
import { ErrorBoundary } from "@/components/error-boundary"

// Phase M — wraps /upgrade and /upgrade/success in an ErrorBoundary so
// Stripe redirect or checkout-session failures surface a graceful fallback
// instead of a blank error page.
export default function UpgradeLayout({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
