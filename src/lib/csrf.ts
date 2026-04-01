import { NextResponse } from "next/server"

/**
 * Validates that the request origin matches the app's domain.
 * Returns a 403 response if the origin doesn't match, or null if valid.
 */
export function checkCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get("origin")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  // In development, allow requests without origin header (e.g. Postman, curl)
  if (!origin) return null

  // If APP_URL is not set, skip check (development safety)
  if (!appUrl) return null

  const allowedOrigin = new URL(appUrl).origin
  if (origin !== allowedOrigin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    )
  }

  return null
}
