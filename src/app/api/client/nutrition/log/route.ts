import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { nutritionLogSchema } from "@/lib/nutrition-log-validate"

/**
 * Client-facing nutrition log endpoint.
 *
 * Strictly requires the caller to be an authenticated client (a row in
 * public.clients with auth_user_id = auth.uid()). No PT-demo fallback path —
 * that lives on /api/nutrition/log for the PT-side demo flow.
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json(
      { error: "Client identity not found" },
      { status: 403 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = nutritionLogSchema.safeParse(body)
  if (!parsed.success) {
    // Don't echo zod issues back — they reveal internal schema shape. Keep
    // them in server telemetry via Sentry breadcrumbs if the caller reports
    // an issue.
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const logData = parsed.data

  const { data: log, error } = await supabase
    .from("nutrition_logs")
    .insert({
      client_id: client.id,
      trainer_id: client.trainer_id,
      photo_url: logData.photo_url ?? null,
      meal_name: logData.meal_name,
      meal_type: logData.meal_type,
      calories: logData.calories ?? null,
      protein_g: logData.protein_g ?? null,
      carbs_g: logData.carbs_g ?? null,
      fat_g: logData.fat_g ?? null,
      ai_raw_response: logData.ai_raw_response ?? null,
      logged_at: logData.logged_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: "Failed to save nutrition log", details: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, log })
}
