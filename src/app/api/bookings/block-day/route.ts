import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const BlockDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = BlockDaySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Check if already blocked to prevent duplicates (no UNIQUE constraint on this combo)
  const { data: existing } = await supabase
    .from("pt_blocked_slots")
    .select("id")
    .eq("trainer_id", user.id)
    .eq("date", parsed.data.date)
    .is("start_time", null)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ success: true })
  }

  const { error } = await supabase
    .from("pt_blocked_slots")
    .insert({
      trainer_id: user.id,
      date: parsed.data.date,
      start_time: null,
      end_time: null,
      reason: "Day blocked by trainer",
    })

  if (error) {
    return NextResponse.json({ error: "Failed to block day" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = BlockDaySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { error } = await supabase
    .from("pt_blocked_slots")
    .delete()
    .eq("trainer_id", user.id)
    .eq("date", parsed.data.date)
    .is("start_time", null)

  if (error) {
    return NextResponse.json({ error: "Failed to unblock day" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
