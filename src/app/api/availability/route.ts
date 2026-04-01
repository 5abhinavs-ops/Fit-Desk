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
  const startOfDay = `${date}T00:00:00.000Z`
  const endOfDay = `${date}T23:59:59.999Z`

  const supabase = createServiceClient()

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("date_time, duration_mins")
    .eq("trainer_id", trainer_id)
    .gte("date_time", startOfDay)
    .lte("date_time", endOfDay)
    .in("status", ["confirmed", "pending"])

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    )
  }

  const busySet = new Set<string>()

  for (const booking of bookings ?? []) {
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

  const busySlots = ALL_SLOTS.filter((s) => busySet.has(s))
  const availableSlots = ALL_SLOTS.filter((s) => !busySet.has(s))

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
