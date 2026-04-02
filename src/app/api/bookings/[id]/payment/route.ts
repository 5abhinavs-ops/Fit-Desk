import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const PaymentSchema = z.object({
  action: z.enum(["mark_paid", "waive", "set_amount"]),
  amount: z.number().min(0).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id: bookingId } = await context.params
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

  const parsed = PaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { action, amount } = parsed.data

  // Verify booking ownership
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, trainer_id")
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (booking.trainer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = new Date().toISOString()

  switch (action) {
    case "mark_paid": {
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          pt_confirmed_at: now,
          ...(amount !== undefined ? { payment_amount: amount } : {}),
        })
        .eq("id", bookingId)

      if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
      return NextResponse.json({ success: true, payment_status: "paid" })
    }

    case "waive": {
      const { error } = await supabase
        .from("bookings")
        .update({
          payment_status: "waived",
          pt_confirmed_at: now,
        })
        .eq("id", bookingId)

      if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
      return NextResponse.json({ success: true, payment_status: "waived" })
    }

    case "set_amount": {
      if (amount === undefined) {
        return NextResponse.json({ error: "Amount is required" }, { status: 400 })
      }

      const { error } = await supabase
        .from("bookings")
        .update({ payment_amount: amount })
        .eq("id", bookingId)

      if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 })
      return NextResponse.json({ success: true, payment_amount: amount })
    }
  }
}
