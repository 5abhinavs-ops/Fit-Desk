import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Whitelist of allowed post-auth redirect paths. Prevents open-redirect by
 * rejecting user-controlled `next` values that point off-app or use protocol
 * prefixes like `//evil.com` or `javascript:`.
 */
function sanitiseNext(raw: string | null): string {
  if (!raw) return "/"
  // Must be a same-origin absolute path with no protocol or host jump.
  if (!raw.startsWith("/")) return "/"
  if (raw.startsWith("//")) return "/"
  if (raw.includes(":")) return "/"
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")
  const next = sanitiseNext(searchParams.get("next"))

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const errorLoginPath = next.startsWith("/client") ? "/client/login" : "/login"
  return NextResponse.redirect(
    `${origin}${errorLoginPath}?error=auth_callback_failed`,
  )
}
