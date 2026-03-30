import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/wati"
import { format } from "date-fns"

interface TriggerError {
  trigger: string
  error: string
}

export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret")
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const errorLog: TriggerError[] = []
  let trigger1Count = 0
  let trigger2Count = 0
  let trigger3Count = 0
  let trigger4Count = 0
  let trigger5Count = 0
  let trigger6Count = 0
  let trigger7Count = 0
  let trigger8Count = 0

  // TRIGGER 1 — 24h session reminders
  try {
    const now = new Date()
    const from23h = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString()
    const to25h = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString()

    const { data: bookings24h } = await supabase
      .from("bookings")
      .select("id, date_time, location, client_id, clients(first_name, whatsapp_number), profiles:trainer_id(name)")
      .gte("date_time", from23h)
      .lte("date_time", to25h)
      .eq("reminder_24h_sent", false)
      .in("status", ["confirmed", "pending"])

    for (const b of bookings24h ?? []) {
      const client = b.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = b.profiles as unknown as { name: string }
      const dt = new Date(b.date_time)
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "session_reminder_24h",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: format(dt, "EEEE, d MMMM") },
          { name: "time", value: format(dt, "h:mm a") },
          { name: "location", value: b.location || "TBC" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("bookings").update({ reminder_24h_sent: true }).eq("id", b.id)
      trigger1Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "session_24h", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 2 — 1h session reminders
  try {
    const now = new Date()
    const from50m = new Date(now.getTime() + 50 * 60 * 1000).toISOString()
    const to70m = new Date(now.getTime() + 70 * 60 * 1000).toISOString()

    const { data: bookings1h } = await supabase
      .from("bookings")
      .select("id, date_time, location, client_id, clients(first_name, whatsapp_number), profiles:trainer_id(name)")
      .gte("date_time", from50m)
      .lte("date_time", to70m)
      .eq("reminder_1h_sent", false)
      .in("status", ["confirmed", "pending"])

    for (const b of bookings1h ?? []) {
      const client = b.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = b.profiles as unknown as { name: string }
      const dt = new Date(b.date_time)
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "session_reminder_1h",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: format(dt, "EEEE, d MMMM") },
          { name: "time", value: format(dt, "h:mm a") },
          { name: "location", value: b.location || "TBC" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("bookings").update({ reminder_1h_sent: true }).eq("id", b.id)
      trigger2Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "session_1h", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 3 — New pending booking notification to trainer
  try {
    const now = new Date()
    const thirtyFiveMinAgo = new Date(now.getTime() - 35 * 60 * 1000).toISOString()

    const { data: newBookings } = await supabase
      .from("bookings")
      .select("id, date_time, session_type, clients(first_name, whatsapp_number), profiles:trainer_id(whatsapp_number, name)")
      .eq("booking_source", "client_link")
      .eq("status", "pending")
      .gte("created_at", thirtyFiveMinAgo)

    for (const b of newBookings ?? []) {
      const client = b.clients as unknown as { first_name: string }
      const trainer = b.profiles as unknown as { whatsapp_number: string; name: string }
      const dt = new Date(b.date_time)
      await sendTemplateMessage({
        whatsappNumber: trainer.whatsapp_number,
        templateName: "new_booking_request",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "date", value: format(dt, "EEEE, d MMMM") },
          { name: "time", value: format(dt, "h:mm a") },
          { name: "session_type", value: b.session_type },
        ],
      })
      trigger3Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "new_booking_notify", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 4 — Package low sessions alert
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: lowPkgs } = await supabase
      .from("packages")
      .select("id, total_sessions, sessions_used, last_low_session_alert_sent, clients(first_name, whatsapp_number), profiles:trainer_id(name)")
      .eq("status", "active")

    for (const pkg of lowPkgs ?? []) {
      const remaining = pkg.total_sessions - pkg.sessions_used
      if (remaining > 2) continue
      if (pkg.last_low_session_alert_sent && pkg.last_low_session_alert_sent > sevenDaysAgo) continue

      const client = pkg.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = pkg.profiles as unknown as { name: string }
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "package_low_sessions",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "sessions_remaining", value: String(remaining) },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("packages").update({ last_low_session_alert_sent: new Date().toISOString() }).eq("id", pkg.id)
      trigger4Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "low_sessions", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 5 — Payment due today
  try {
    const today = new Date().toISOString().split("T")[0]

    const { data: dueTodayPayments } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .eq("due_date", today)
      .eq("status", "pending")
      .eq("overdue_reminder_stage", "none")

    for (const p of dueTodayPayments ?? []) {
      const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "payment_due_today",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "amount", value: `$${p.amount}` },
          { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      trigger5Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "payment_due", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 6 — Overdue day 1
  try {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue1 } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .eq("due_date", yesterday)
      .eq("status", "pending")
      .eq("overdue_reminder_stage", "none")

    for (const p of overdue1 ?? []) {
      const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "payment_overdue_1",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "amount", value: `$${p.amount}` },
          { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("payments").update({ overdue_reminder_stage: "day_1" }).eq("id", p.id)
      trigger6Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day1", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 7 — Overdue day 3
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue3 } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .lte("due_date", threeDaysAgo)
      .eq("status", "pending")
      .eq("overdue_reminder_stage", "day_1")

    for (const p of overdue3 ?? []) {
      const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "payment_overdue_3",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "amount", value: `$${p.amount}` },
          { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("payments").update({ overdue_reminder_stage: "day_3" }).eq("id", p.id)
      trigger7Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day3", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 8 — Overdue day 7 + auto-pause client
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue7 } = await supabase
      .from("payments")
      .select("id, amount, client_id, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .lte("due_date", sevenDaysAgo)
      .eq("status", "pending")
      .eq("overdue_reminder_stage", "day_3")

    for (const p of overdue7 ?? []) {
      const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
      const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
      await sendTemplateMessage({
        whatsappNumber: client.whatsapp_number,
        templateName: "payment_overdue_7",
        parameters: [
          { name: "client_name", value: client.first_name },
          { name: "amount", value: `$${p.amount}` },
          { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
          { name: "trainer_name", value: trainer.name },
        ],
      })
      await supabase.from("payments").update({ overdue_reminder_stage: "day_7" }).eq("id", p.id)
      await supabase.from("clients").update({ status: "paused" }).eq("id", p.client_id)
      trigger8Count++
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day7", error: err instanceof Error ? err.message : String(err) })
  }

  return NextResponse.json({
    success: true,
    summary: {
      session_24h: trigger1Count,
      session_1h: trigger2Count,
      new_booking_notify: trigger3Count,
      low_sessions: trigger4Count,
      payment_due: trigger5Count,
      overdue_day1: trigger6Count,
      overdue_day3: trigger7Count,
      overdue_day7: trigger8Count,
    },
    errors: errorLog,
    ran_at: new Date().toISOString(),
  })
}
