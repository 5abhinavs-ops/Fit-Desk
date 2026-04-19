"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Phase M — log render errors so Stripe checkout / payment proof flows
    // and other error-boundary-wrapped surfaces leave a trace rather than
    // silently rendering the fallback. Vercel captures server-side console
    // output; browser console is surfaced in DevTools.
    console.error(
      "[ErrorBoundary] render error",
      error,
      info.componentStack ?? ""
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">
            Please refresh the page and try again.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
