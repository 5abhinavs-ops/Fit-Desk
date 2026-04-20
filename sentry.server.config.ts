import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    enabled: process.env.NODE_ENV === "production",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    // Strip cookies and auth headers before sending.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)["authorization"]
        delete (event.request.headers as Record<string, unknown>)["cookie"]
      }
      return event
    },
  })
}
