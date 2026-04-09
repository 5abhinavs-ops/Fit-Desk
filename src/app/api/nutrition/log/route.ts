import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const LogSchema = z.object({
  photo_url: z.string().nullable().optional(),
  meal_name: z.string().min(1),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.number().int().min(0).nullable().optional(),
  protein_g: z.number().min(0).nullable().optional(),
  carbs_g: z.number().min(0).nullable().optional(),
  fat_g: z.number().min(0).nullable().optional(),
  ai_raw_response: z.string().nullable().optional(),
  logged_at: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = LogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const logData = parsed.data

  // Look up client: first try auth_user_id (client app), then id (PT demo)
  const { data: clientByAuth } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("auth_user_id", user.id)
    .single()

  const clientRecord = clientByAuth ?? (
    await supabase
      .from("clients")
      .select("id, trainer_id")
      .eq("id", user.id)
      .single()
  ).data

  const clientId = clientRecord?.id ?? user.id
  const trainerId = clientRecord?.trainer_id ?? user.id

  const { data: log, error } = await supabase
    .from("nutrition_logs")
    .insert({
      client_id: clientId,
      trainer_id: trainerId,
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
    return NextResponse.json({ error: "Failed to save nutrition log", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, log })
}
