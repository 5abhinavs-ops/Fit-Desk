import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { addDays, format } from "date-fns"

const GenerateSchema = z.object({
  schedule_id: z.string().uuid(),
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

  const parsed = GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Fetch the recurring schedule (trainer-scoped via RLS)
  const { data: schedule, error: schedError } = await supabase
    .from("recurring_schedules")
    .select("*")
    .eq("id", parsed.data.schedule_id)
    .eq("trainer_id", user.id)
    .single()

  if (schedError || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 })
  }

  // Fetch the package — explicitly scoped to trainer_id for ownership verification
  if (!schedule.package_id) {
    return NextResponse.json({ error: "No package linked to schedule" }, { status: 400 })
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("total_sessions, sessions_used, client_id")
    .eq("id", schedule.package_id)
    .eq("trainer_id", user.id)
    .single()

  if (pkgError || !pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  // Verify package belongs to the same client as the schedule
  if (pkg.client_id !== schedule.client_id) {
    return NextResponse.json({ error: "Package does not belong to this client" }, { status: 400 })
  }

  const remaining = pkg.total_sessions - pkg.sessions_used
  if (remaining <= 0) {
    return NextResponse.json({ error: "No sessions remaining in package" }, { status: 400 })
  }

  // Generate future occurrences of day_of_week from start_date
  const startDate = new Date(`${schedule.start_date}T00:00:00+08:00`)
  let cursor = startDate

  // Find first occurrence of the target day_of_week
  while (cursor.getDay() !== schedule.day_of_week) {
    cursor = addDays(cursor, 1)
  }

  // Collect up to `remaining` occurrences
  const occurrences: string[] = []
  for (let i = 0; i < remaining && i < 52; i++) {
    occurrences.push(format(cursor, "yyyy-MM-dd"))
    cursor = addDays(cursor, 7)
  }

  if (occurrences.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  // Deduplicate: check for existing bookings on these date_times to prevent duplicates on retry
  const dateTimes = occurrences.map((d) => `${d}T${schedule.start_time}:00+08:00`)
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("date_time")
    .eq("trainer_id", user.id)
    .eq("client_id", schedule.client_id)
    .in("date_time", dateTimes)
    .in("status", ["confirmed", "pending", "upcoming"])

  const existingSet = new Set(
    (existingBookings ?? []).map((b) => b.date_time),
  )

  // Create bookings for non-duplicate occurrences using RLS-scoped client
  const bookings = occurrences
    .filter((dateStr) => !existingSet.has(`${dateStr}T${schedule.start_time}:00+08:00`))
    .map((dateStr) => ({
      trainer_id: user.id,
      client_id: schedule.client_id,
      package_id: schedule.package_id,
      date_time: `${dateStr}T${schedule.start_time}:00+08:00`,
      duration_mins: schedule.duration_mins,
      session_type: "1-on-1" as const,
      status: "confirmed" as const,
      payment_mode: "from_package" as const,
      booking_source: "recurring" as const,
      reminder_24h_sent: false,
      reminder_1h_sent: false,
    }))

  if (bookings.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  const { error: insertError } = await supabase
    .from("bookings")
    .insert(bookings)

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create bookings" },
      { status: 500 },
    )
  }

  return NextResponse.json({ created: bookings.length })
}
