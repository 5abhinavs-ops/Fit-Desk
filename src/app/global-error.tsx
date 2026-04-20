"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0D1B2A",
          color: "#FFFFFF",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main
          style={{
            maxWidth: 420,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: "#1A3349",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              color: "#00C6D4",
              fontWeight: 700,
            }}
            aria-hidden
          >
            !
          </div>

          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 8 }}>
              FitDesk hit a snag
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#7A9BB5", margin: 0 }}>
              A critical error stopped the app from loading. Please try again — if
              this keeps happening, let us know so we can fix it fast.
            </p>
            {error.digest ? (
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#7A9BB5",
                  marginTop: 12,
                }}
              >
                Ref {error.digest}
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                backgroundColor: "#00C6D4",
                color: "#0D1B2A",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* next/link is not supported inside global-error.tsx — it renders
                below the html/body without a Next router context. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid rgba(0,198,212,0.24)",
                color: "#FFFFFF",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Go home
            </a>
          </div>

          <a
            href="mailto:support@fitdesk.pro"
            style={{ fontSize: 12, color: "#00C6D4", textDecoration: "none" }}
          >
            support@fitdesk.pro
          </a>
        </main>
      </body>
    </html>
  )
}
