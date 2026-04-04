import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const CopyWeekSchema = z.object({
  source_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((val) => {
    const d = new Date(`${val}T00:00:00.000Z`)
    return !isNaN(d.getTime()) && d.toISOString().startsWith(val)
  }, { message: "Invalid calendar date" }),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = CopyWeekSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { source_week_start } = parsed.data

  // Source week: Mon 00:00 SGT to Sun 23:59 SGT
  const weekStart = `${source_week_start}T00:00:00+08:00`
  const weekEndDate = new Date(source_week_start + "T00:00:00Z")
  weekEndDate.setDate(weekEndDate.getDate() + 6)
  const weekEnd = `${weekEndDate.toISOString().split("T")[0]}T23:59:59+08:00`

  const { data: sourceBookings, error } = await supabase
    .from("bookings")
    .select("client_id, package_id, date_time, duration_mins, location, session_type, payment_mode, booking_source")
    .eq("trainer_id", user.id)
    .gte("date_time", weekStart)
    .lte("date_time", weekEnd)
    .in("status", ["confirmed", "pending", "upcoming"])

  if (error) return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  if (!sourceBookings || sourceBookings.length === 0) {
    return NextResponse.json({ error: "No bookings found in source week" }, { status: 404 })
  }

  // Target week is source + 7 days
  const targetWeekStart = new Date(source_week_start + "T00:00:00+08:00")
  targetWeekStart.setDate(targetWeekStart.getDate() + 7)
  const targetWeekEnd = new Date(targetWeekStart)
  targetWeekEnd.setDate(targetWeekEnd.getDate() + 6)

  // Fetch existing bookings in target week to check for conflicts
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("client_id, date_time")
    .eq("trainer_id", user.id)
    .gte("date_time", `${targetWeekStart.toISOString().split("T")[0]}T00:00:00+08:00`)
    .lte("date_time", `${targetWeekEnd.toISOString().split("T")[0]}T23:59:59+08:00`)
    .in("status", ["confirmed", "pending", "upcoming"])

  const existingSet = new Set(
    (existingBookings ?? []).map((b) => `${b.client_id}|${b.date_time}`)
  )

  const rowsToInsert: Array<Record<string, unknown>> = []
  let skipped = 0

  for (const booking of sourceBookings) {
    const sourceDate = new Date(booking.date_time)
    const targetDate = new Date(sourceDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const targetDateTime = targetDate.toISOString()

    if (existingSet.has(`${booking.client_id}|${targetDateTime}`)) {
      skipped++
      continue
    }

    rowsToInsert.push({
      trainer_id: user.id,
      client_id: booking.client_id,
      package_id: booking.package_id,
      date_time: targetDateTime,
      duration_mins: booking.duration_mins,
      location: booking.location,
      session_type: booking.session_type,
      payment_mode: booking.payment_mode,
      booking_source: booking.booking_source,
      status: "upcoming",
    })
  }

  if (rowsToInsert.length === 0) {
    return NextResponse.json({ success: true, created: 0, skipped })
  }

  const { error: insertError } = await supabase
    .from("bookings")
    .insert(rowsToInsert)

  if (insertError) {
    return NextResponse.json({ error: "Failed to create bookings" }, { status: 500 })
  }

  return NextResponse.json({ success: true, created: rowsToInsert.length, skipped })
}
