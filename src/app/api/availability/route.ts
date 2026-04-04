import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const querySchema = z.object({
  trainer_id: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((val) => {
      const d = new Date(`${val}T00:00:00.000Z`)
      return !isNaN(d.getTime()) && d.toISOString().startsWith(val)
    }, { message: "Invalid calendar date" })
    .refine((val) => {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      const d = new Date(`${val}T00:00:00.000Z`)
      const maxFuture = new Date(today)
      maxFuture.setDate(today.getDate() + 90)
      return d >= today && d <= maxFuture
    }, { message: "Date must be today or within the next 90 days" }),
})

const ALL_SLOTS: string[] = []
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue
    const hh = h.toString().padStart(2, "0")
    const mm = m.toString().padStart(2, "0")
    ALL_SLOTS.push(`${hh}:${mm}`)
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 10 requests per IP per minute
  const ip = getClientIp(request)
  const limit = checkRateLimit(`availability:${ip}`, 10, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    )
  }

  const { searchParams } = request.nextUrl
  const parsed = querySchema.safeParse({
    trainer_id: searchParams.get("trainer_id"),
    date: searchParams.get("date"),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 })
  }

  const { trainer_id, date } = parsed.data

  // Per-trainer rate limit to prevent schedule enumeration
  const trainerLimit = checkRateLimit(`availability:trainer:${trainer_id}`, 30, 60_000)
  if (!trainerLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(trainerLimit.retryAfterSeconds) } },
    )
  }
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  const supabase = createServiceClient()

  // Fetch bookings, working hours, and blocked slots in parallel
  const [bookingsResult, workingHoursResult, blockedSlotsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("date_time, duration_mins")
      .eq("trainer_id", trainer_id)
      .gte("date_time", startOfDay)
      .lte("date_time", endOfDay)
      .in("status", ["confirmed", "pending"]),
    supabase
      .from("pt_working_hours")
      .select("day_of_week, start_time, end_time, is_active")
      .eq("trainer_id", trainer_id),
    supabase
      .from("pt_blocked_slots")
      .select("start_time, end_time")
      .eq("trainer_id", trainer_id)
      .eq("date", date),
  ])

  if (bookingsResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }

  const bookings = bookingsResult.data ?? []
  const workingHours = workingHoursResult.data ?? []
  const blockedSlots = blockedSlotsResult.data ?? []

  // Step 1: Determine which slots fall within working hours
  const requestedDate = new Date(`${date}T00:00:00.000Z`)
  const dayOfWeek = requestedDate.getUTCDay() // 0=Sun...6=Sat
  const dayConfig = workingHours.find((wh) => wh.day_of_week === dayOfWeek)

  const workingSet = new Set<string>()
  if (!dayConfig || !dayConfig.is_active) {
    // Day off — no slots available (workingSet stays empty)
  } else {
    for (const slot of ALL_SLOTS) {
      if (slot >= dayConfig.start_time && slot < dayConfig.end_time) {
        workingSet.add(slot)
      }
    }
  }

  // Step 2: Mark booked slots as busy
  const busySet = new Set<string>()
  for (const booking of bookings) {
    const dt = new Date(booking.date_time)
    const hours = dt.getUTCHours()
    const minutes = dt.getUTCMinutes()
    const roundedMinutes = Math.floor(minutes / 30) * 30
    const startSlotIndex = ALL_SLOTS.indexOf(
      `${hours.toString().padStart(2, "0")}:${roundedMinutes.toString().padStart(2, "0")}`
    )

    if (startSlotIndex === -1) continue

    const slotsBlocked = Math.min(Math.ceil(booking.duration_mins / 30), ALL_SLOTS.length)
    for (let i = 0; i < slotsBlocked; i++) {
      const idx = startSlotIndex + i
      if (idx < ALL_SLOTS.length) {
        busySet.add(ALL_SLOTS[idx])
      }
    }
  }

  // Step 3: Apply blocked slots
  for (const blocked of blockedSlots) {
    if (!blocked.start_time || !blocked.end_time) {
      // Full day block
      ALL_SLOTS.forEach((s) => busySet.add(s))
    } else {
      for (const slot of ALL_SLOTS) {
        if (slot >= blocked.start_time && slot < blocked.end_time) {
          busySet.add(slot)
        }
      }
    }
  }

  // Step 4: A slot is available only if within working hours AND not busy
  const availableSlots = ALL_SLOTS.filter((s) => workingSet.has(s) && !busySet.has(s))
  const busySlots = ALL_SLOTS.filter((s) => !availableSlots.includes(s))

  return NextResponse.json(
    { date, busySlots, availableSlots },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  )
}
