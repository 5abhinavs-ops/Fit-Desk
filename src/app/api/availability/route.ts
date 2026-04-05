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

  // Fetch bookings, open slots, date overrides, and blocked slots in parallel
  const [bookingsResult, openSlotsResult, dateOverridesResult, blockedSlotsResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("date_time, duration_mins")
      .eq("trainer_id", trainer_id)
      .gte("date_time", startOfDay)
      .lte("date_time", endOfDay)
      .in("status", ["confirmed", "pending", "upcoming"]),
    supabase
      .from("pt_open_slots")
      .select("day_of_week, start_time, duration_mins")
      .eq("trainer_id", trainer_id),
    supabase
      .from("pt_date_slot_overrides")
      .select("start_time, duration_mins, is_removed")
      .eq("trainer_id", trainer_id)
      .eq("date", date),
    supabase
      .from("pt_blocked_slots")
      .select("start_time, end_time")
      .eq("trainer_id", trainer_id)
      .eq("date", date),
  ])

  if (bookingsResult.error || openSlotsResult.error || dateOverridesResult.error || blockedSlotsResult.error) {
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }

  const bookings = bookingsResult.data ?? []
  const openSlots = openSlotsResult.data ?? []
  const dateOverrides = dateOverridesResult.data ?? []
  const blockedSlots = blockedSlotsResult.data ?? []

  // Step 1: Build open slot set from weekly defaults for this day_of_week
  const requestedDate = new Date(`${date}T00:00:00.000Z`)
  const dayOfWeek = requestedDate.getUTCDay() // 0=Sun...6=Sat
  const openSet = new Set<string>()

  for (const slot of openSlots) {
    if (slot.day_of_week === dayOfWeek) {
      openSet.add(slot.start_time)
    }
  }

  // Step 2: Apply date overrides
  for (const override of dateOverrides) {
    if (override.is_removed) {
      openSet.delete(override.start_time)
    } else {
      openSet.add(override.start_time)
    }
  }

  // Step 3: Mark booked slots as busy
  // Bookings are stored with timezone offset (e.g. +08:00 for SGT).
  // Shift to SGT (UTC+8) to match the slot times which are in local wall-clock time.
  const busySet = new Set<string>()
  for (const booking of bookings) {
    const dt = new Date(booking.date_time)
    const sgt = new Date(dt.getTime() + 8 * 60 * 60 * 1000)
    const hours = sgt.getUTCHours()
    const minutes = sgt.getUTCMinutes()
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

  // Step 4: Apply blocked slots
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

  // Step 5: Available = open AND not busy
  const availableSlots = ALL_SLOTS.filter((s) => openSet.has(s) && !busySet.has(s))
  const busySlots = ALL_SLOTS.filter((s) => openSet.has(s) && busySet.has(s))

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
