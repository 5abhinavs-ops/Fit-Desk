import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side contexts like cron jobs where there is no user session.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
