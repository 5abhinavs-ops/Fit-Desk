import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { format } from "date-fns"

const ActionSchema = z.object({
  action: z.enum(["restore", "forfeit", "no_show", "reschedule"]),
  reschedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reschedule_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
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

  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  const { action, reschedule_date, reschedule_time } = parsed.data

  // Fetch booking and verify ownership
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("*, clients(first_name, whatsapp_number), profiles:trainer_id(name, whatsapp_number)")
    .eq("id", bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (booking.trainer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = booking.clients as unknown as { first_name: string; whatsapp_number: string }
  const trainer = booking.profiles as unknown as { name: string; whatsapp_number: string }
  const dt = new Date(booking.date_time)
  const dateStr = format(dt, "EEEE, d MMMM")
  const timeStr = format(dt, "h:mm a")

  // Service client for session_tokens (RLS blocks normal client)
  const serviceClient = createServiceClient()

  switch (action) {
    case "restore": {
      // Cancel booking and restore session to package
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: "pt",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      if (error) {
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
      }

      // If linked to a package, decrement sessions_used
      if (booking.package_id) {
        const { data: pkg } = await supabase
          .from("packages")
          .select("sessions_used")
          .eq("id", booking.package_id)
          .single()

        if (pkg && pkg.sessions_used > 0) {
          await supabase
            .from("packages")
            .update({
              sessions_used: pkg.sessions_used - 1,
              status: "active",
            })
            .eq("id", booking.package_id)
        }
      }

      // Get remaining sessions for message
      let remaining = "N/A"
      if (booking.package_id) {
        const { data: updatedPkg } = await supabase
          .from("packages")
          .select("total_sessions, sessions_used")
          .eq("id", booking.package_id)
          .single()
        if (updatedPkg) {
          remaining = String(updatedPkg.total_sessions - updatedPkg.sessions_used)
        }
      }

      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "booking_cancelled_restore",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
          { name: "trainer_name", value: trainer.name },
          { name: "sessions_remaining", value: remaining },
        ],
      })

      return NextResponse.json({ success: true, action: "restore" })
    }

    case "forfeit": {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "forfeited",
          cancelled_by: "pt",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      if (error) {
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
      }

      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "booking_cancelled_forfeit",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
          { name: "trainer_name", value: trainer.name },
        ],
      })

      return NextResponse.json({ success: true, action: "forfeit" })
    }

    case "no_show": {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "no_show" })
        .eq("id", bookingId)

      if (error) {
        return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
      }

      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "booking_no_show",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: dateStr },
          { name: "trainer_name", value: trainer.name },
        ],
      })

      return NextResponse.json({ success: true, action: "no_show" })
    }

    case "reschedule": {
      if (!reschedule_date || !reschedule_time) {
        return NextResponse.json(
          { error: "reschedule_date and reschedule_time are required for reschedule action" },
          { status: 400 },
        )
      }

      // Cancel old booking
      const { error: cancelError } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancelled_by: "pt",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: "Rescheduled",
        })
        .eq("id", bookingId)

      if (cancelError) {
        return NextResponse.json({ error: "Failed to cancel old booking" }, { status: 500 })
      }

      // Create new booking
      const newDateTime = new Date(`${reschedule_date}T${reschedule_time}:00`).toISOString()
      const { data: newBooking, error: createError } = await supabase
        .from("bookings")
        .insert({
          trainer_id: booking.trainer_id,
          client_id: booking.client_id,
          package_id: booking.package_id,
          date_time: newDateTime,
          duration_mins: booking.duration_mins,
          location: booking.location,
          session_type: booking.session_type,
          status: "upcoming",
          payment_mode: booking.payment_mode,
          booking_source: booking.booking_source,
        })
        .select("id")
        .single()

      if (createError || !newBooking) {
        return NextResponse.json({ error: "Failed to create rescheduled booking" }, { status: 500 })
      }

      // Generate session token for the new booking
      const newDt = new Date(newDateTime)
      await serviceClient.from("session_tokens").insert({
        booking_id: newBooking.id,
        expires_at: newDt.toISOString(),
      })

      const newDateStr = format(newDt, "EEEE, d MMMM")
      const newTimeStr = format(newDt, "h:mm a")

      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "booking_rescheduled",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "new_date", value: newDateStr },
          { name: "new_time", value: newTimeStr },
          { name: "trainer_name", value: trainer.name },
        ],
      })

      return NextResponse.json({ success: true, action: "reschedule", newBookingId: newBooking.id })
    }
  }
}
