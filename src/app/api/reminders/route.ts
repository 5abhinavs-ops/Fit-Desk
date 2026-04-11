import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { getOrCreateSessionToken } from "@/lib/session-tokens"
import { format } from "date-fns"

interface TriggerError {
  trigger: string
  itemId: string
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
  let trigger9Count = 0
  let trigger10Count = 0
  let trigger11Count = 0
  let trigger12Count = 0
  let trigger13Count = 0
  let trigger14Count = 0
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fitdesk.app"

  // TRIGGER 1 — 24h session reminders (with session management link)
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
      .in("status", ["confirmed", "pending", "upcoming"])

    for (const b of bookings24h ?? []) {
      try {
        const client = b.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = b.profiles as unknown as { name: string }
        const dt = new Date(b.date_time)

        // Generate session token for management link
        const sessionToken = await getOrCreateSessionToken(b.id, b.date_time)
        const sessionLink = sessionToken ? `${appUrl}/session/${sessionToken}` : ""

        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "session_reminder_24h_with_link",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "date", value: format(dt, "EEEE, d MMMM") },
            { name: "time", value: format(dt, "h:mm a") },
            { name: "location", value: b.location || "TBC" },
            { name: "trainer_name", value: trainer.name },
            { name: "session_link", value: sessionLink },
          ],
        })
        if (result.success) {
          await supabase.from("bookings").update({ reminder_24h_sent: true }).eq("id", b.id)
          trigger1Count++
        } else {
          errorLog.push({ trigger: "session_24h", itemId: b.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "session_24h", itemId: b.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "session_24h", itemId: "query", error: err instanceof Error ? err.message : String(err) })
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
      .in("status", ["confirmed", "pending", "upcoming"])

    for (const b of bookings1h ?? []) {
      try {
        const client = b.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = b.profiles as unknown as { name: string }
        const dt = new Date(b.date_time)
        const result = await sendTemplateMessage({
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
        if (result.success) {
          await supabase.from("bookings").update({ reminder_1h_sent: true }).eq("id", b.id)
          trigger2Count++
        } else {
          errorLog.push({ trigger: "session_1h", itemId: b.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "session_1h", itemId: b.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "session_1h", itemId: "query", error: err instanceof Error ? err.message : String(err) })
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
      try {
        const client = b.clients as unknown as { first_name: string }
        const trainer = b.profiles as unknown as { whatsapp_number: string; name: string }
        const dt = new Date(b.date_time)
        const result = await sendTemplateMessage({
          whatsappNumber: trainer.whatsapp_number,
          templateName: "new_booking_request",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "date", value: format(dt, "EEEE, d MMMM") },
            { name: "time", value: format(dt, "h:mm a") },
            { name: "session_type", value: b.session_type },
          ],
        })
        if (result.success) {
          trigger3Count++
        } else {
          errorLog.push({ trigger: "new_booking_notify", itemId: b.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "new_booking_notify", itemId: b.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "new_booking_notify", itemId: "query", error: err instanceof Error ? err.message : String(err) })
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

      try {
        const client = pkg.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = pkg.profiles as unknown as { name: string }
        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "package_low_sessions",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "sessions_remaining", value: String(remaining) },
            { name: "trainer_name", value: trainer.name },
          ],
        })
        if (result.success) {
          await supabase.from("packages").update({ last_low_session_alert_sent: new Date().toISOString() }).eq("id", pkg.id)
          trigger4Count++
        } else {
          errorLog.push({ trigger: "low_sessions", itemId: pkg.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "low_sessions", itemId: pkg.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "low_sessions", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 5 — Payment due today
  // Sets overdue_reminder_stage to "due_today_sent" to prevent double-fire with Trigger 6
  try {
    const today = new Date().toISOString().split("T")[0]

    const { data: dueTodayPayments } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .eq("due_date", today)
      .eq("status", "pending")
      .eq("overdue_reminder_stage", "none")

    for (const p of dueTodayPayments ?? []) {
      try {
        const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "payment_due_today",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "amount", value: `$${p.amount}` },
            { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
            { name: "trainer_name", value: trainer.name },
          ],
        })
        if (result.success) {
          // Mark as processed so Trigger 6 won't re-fire on this payment
          await supabase.from("payments").update({ overdue_reminder_stage: "due_today_sent" }).eq("id", p.id)
          trigger5Count++
        } else {
          errorLog.push({ trigger: "payment_due", itemId: p.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "payment_due", itemId: p.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "payment_due", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 6 — Overdue day 1
  try {
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue1 } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .lte("due_date", yesterday)
      .eq("status", "pending")
      .in("overdue_reminder_stage", ["none", "due_today_sent"])

    for (const p of overdue1 ?? []) {
      try {
        const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "payment_overdue_1",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "amount", value: `$${p.amount}` },
            { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
            { name: "trainer_name", value: trainer.name },
          ],
        })
        if (result.success) {
          await supabase.from("payments").update({ overdue_reminder_stage: "day_1", status: "overdue" }).eq("id", p.id)
          trigger6Count++
        } else {
          errorLog.push({ trigger: "overdue_day1", itemId: p.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "overdue_day1", itemId: p.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day1", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 7 — Overdue day 3
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue3 } = await supabase
      .from("payments")
      .select("id, amount, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .lte("due_date", threeDaysAgo)
      .eq("status", "overdue")
      .eq("overdue_reminder_stage", "day_1")

    for (const p of overdue3 ?? []) {
      try {
        const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "payment_overdue_3",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "amount", value: `$${p.amount}` },
            { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
            { name: "trainer_name", value: trainer.name },
          ],
        })
        if (result.success) {
          await supabase.from("payments").update({ overdue_reminder_stage: "day_3" }).eq("id", p.id)
          trigger7Count++
        } else {
          errorLog.push({ trigger: "overdue_day3", itemId: p.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "overdue_day3", itemId: p.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day3", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 8 — Overdue day 7 + auto-pause client
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const { data: overdue7 } = await supabase
      .from("payments")
      .select("id, amount, client_id, clients(first_name, whatsapp_number), profiles:trainer_id(name, paynow_details)")
      .lte("due_date", sevenDaysAgo)
      .eq("status", "overdue")
      .eq("overdue_reminder_stage", "day_3")

    for (const p of overdue7 ?? []) {
      try {
        const client = p.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = p.profiles as unknown as { name: string; paynow_details: string | null }
        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "payment_overdue_7",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "amount", value: `$${p.amount}` },
            { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
            { name: "trainer_name", value: trainer.name },
          ],
        })
        if (result.success) {
          await supabase.from("payments").update({ overdue_reminder_stage: "day_7" }).eq("id", p.id)
          await supabase.from("clients").update({ status: "paused" }).eq("id", p.client_id)
          trigger8Count++
        } else {
          errorLog.push({ trigger: "overdue_day7", itemId: p.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "overdue_day7", itemId: p.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "overdue_day7", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 9 — 1h chase for unconfirmed bookings
  try {
    const now = new Date()
    const from60m = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    const to90m = new Date(now.getTime() + 90 * 60 * 1000).toISOString()

    const { data: unconfirmed } = await supabase
      .from("bookings")
      .select("id, date_time, client_id, chase_sent_at, attendance_confirmed_at, cancelled_at, clients(first_name, whatsapp_number), profiles:trainer_id(name)")
      .gte("date_time", from60m)
      .lte("date_time", to90m)
      .in("status", ["confirmed", "pending", "upcoming"])
      .is("attendance_confirmed_at", null)
      .is("cancelled_at", null)
      .is("chase_sent_at", null)

    for (const b of unconfirmed ?? []) {
      try {
        const client = b.clients as unknown as { first_name: string; whatsapp_number: string }
        const trainer = b.profiles as unknown as { name: string }
        const dt = new Date(b.date_time)

        const sessionToken = await getOrCreateSessionToken(b.id, b.date_time)
        const sessionLink = sessionToken ? `${appUrl}/session/${sessionToken}` : ""

        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "session_chase_1h",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "trainer_name", value: trainer.name },
            { name: "time", value: format(dt, "h:mm a") },
            { name: "session_link", value: sessionLink },
          ],
        })
        if (result.success) {
          await supabase.from("bookings").update({ chase_sent_at: now.toISOString() }).eq("id", b.id)
          trigger9Count++
        } else {
          errorLog.push({ trigger: "chase_1h", itemId: b.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "chase_1h", itemId: b.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "chase_1h", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 10 — Per-client payment reminders for completed sessions
  try {
    const now = new Date()

    // Fetch bookings with unpaid/client_confirmed status for past sessions
    const { data: unpaidBookings } = await supabase
      .from("bookings")
      .select(`
        id, date_time, payment_status, payment_amount, payment_reminder_sent_at,
        client_id, clients(first_name, whatsapp_number, payment_reminder_days),
        profiles:trainer_id(name, paynow_number, paynow_details, payment_link, payment_reminder_default_days)
      `)
      .in("payment_status", ["unpaid", "client_confirmed"])
      .lt("date_time", now.toISOString())
      .not("status", "in", '("cancelled","forfeited","no_show")')

    for (const b of unpaidBookings ?? []) {
      try {
        const client = b.clients as unknown as {
          first_name: string
          whatsapp_number: string
          payment_reminder_days: number | null
        }
        const trainer = b.profiles as unknown as {
          name: string
          paynow_number: string | null
          paynow_details: string | null
          payment_link: string | null
          payment_reminder_default_days: number
        }

        const reminderDays = client.payment_reminder_days ?? trainer.payment_reminder_default_days ?? 3
        const intervalMs = reminderDays * 24 * 60 * 60 * 1000

        // Skip if reminder was sent recently
        if (b.payment_reminder_sent_at) {
          const lastSent = new Date(b.payment_reminder_sent_at)
          if (now.getTime() - lastSent.getTime() < intervalMs) continue
        }

        const paymentDetails = trainer.paynow_number || trainer.paynow_details || "contact your trainer"
        const linkText = trainer.payment_link ? ` | ${trainer.payment_link}` : ""
        const amountText = b.payment_amount ? `$${b.payment_amount}` : "outstanding"

        const result = await sendTemplateMessage({
          whatsappNumber: client.whatsapp_number,
          templateName: "payment_reminder",
          parameters: [
            { name: "client_name", value: client.first_name },
            { name: "trainer_name", value: trainer.name },
            { name: "date", value: format(new Date(b.date_time), "EEEE, d MMMM") },
            { name: "amount", value: amountText },
            { name: "payment_details", value: `PayNow: ${paymentDetails}${linkText}` },
          ],
        })

        if (result.success) {
          await supabase
            .from("bookings")
            .update({ payment_reminder_sent_at: now.toISOString() })
            .eq("id", b.id)
          trigger10Count++
        } else {
          errorLog.push({ trigger: "payment_reminder", itemId: b.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "payment_reminder", itemId: b.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "payment_reminder", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // TRIGGER 11 — Lapsed client reactivation alert to trainer
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: lapsedClients } = await supabase
      .from("clients")
      .select("id, first_name, last_name, last_session_date, last_reactivation_alert_sent, trainer_id, profiles:trainer_id(whatsapp_number, name)")
      .eq("status", "active")
      .lt("last_session_date", fourteenDaysAgo)

    for (const c of lapsedClients ?? []) {
      // Skip if alert was sent within the last 14 days
      if (c.last_reactivation_alert_sent && c.last_reactivation_alert_sent > fourteenDaysAgo) continue
      if (!c.last_session_date) continue

      try {
        const trainer = c.profiles as unknown as { whatsapp_number: string; name: string } | null
        if (!trainer) continue
        const clientName = `${c.first_name} ${c.last_name}`.trim()
        const daysSince = Math.floor((Date.now() - new Date(c.last_session_date).getTime()) / (24 * 60 * 60 * 1000))

        const result = await sendTemplateMessage({
          whatsappNumber: trainer.whatsapp_number,
          templateName: "client_lapsed_alert",
          parameters: [
            { name: "trainer_name", value: trainer.name },
            { name: "client_name", value: clientName },
            { name: "days_since", value: String(daysSince) },
          ],
        })
        if (result.success) {
          await supabase.from("clients").update({ last_reactivation_alert_sent: new Date().toISOString() }).eq("id", c.id)
          trigger11Count++
        } else {
          errorLog.push({ trigger: "client_lapsed", itemId: c.id, error: result.error || "Send failed" })
        }
      } catch (err) {
        errorLog.push({ trigger: "client_lapsed", itemId: c.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  } catch (err) {
    errorLog.push({ trigger: "client_lapsed", itemId: "query", error: err instanceof Error ? err.message : String(err) })
  }

  // --- PT Daily Schedule Helpers ---
  function getSGTDateString(date: Date): string {
    const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return sgt.toISOString().split("T")[0]
  }

  function getSGTHour(date: Date): number {
    const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return sgt.getUTCHours()
  }

  function buildSchedulePayload(
    bookings: Array<{
      date_time: string
      session_type: string
      status: string
      clients: { first_name: string; last_name: string } | null
    }>,
    fromHourSGT: number,
  ): { sessionList: string; remainingCount: number; cancelledNote: string } {
    const activeStatuses = ["confirmed", "upcoming", "pending", "pending_approval"]
    const cancelledStatuses = ["cancelled", "forfeited"]

    const remaining = bookings.filter((b) => {
      const sgtHour = getSGTHour(new Date(b.date_time))
      return sgtHour >= fromHourSGT && activeStatuses.includes(b.status)
    })

    const cancelled = bookings.filter((b) => cancelledStatuses.includes(b.status))

    const sessionList =
      remaining.length === 0
        ? "No sessions remaining."
        : remaining
            .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
            .map((b) => {
              const sgt = new Date(new Date(b.date_time).getTime() + 8 * 60 * 60 * 1000)
              const h = sgt.getUTCHours()
              const m = sgt.getUTCMinutes()
              const ampm = h >= 12 ? "PM" : "AM"
              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
              const timeStr = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
              const clientName = b.clients
                ? `${b.clients.first_name} ${b.clients.last_name}`.trim()
                : "Unknown"
              return `${timeStr} — ${clientName} (${b.session_type})`
            })
            .join(", ") + "."

    const cancelledNote =
      cancelled.length === 0
        ? ""
        : ` Note: ${cancelled.length} session${cancelled.length > 1 ? "s were" : " was"} cancelled today.`

    return { sessionList, remainingCount: remaining.length, cancelledNote }
  }

  // --- TRIGGER 12, 13, 14: PT Daily Schedule Notifications ---
  const scheduleConfigs = [
    { triggerHour: 6, fromHour: 6, templateName: "pt_daily_schedule_morning", triggerLabel: "pt_schedule_morning" },
    { triggerHour: 12, fromHour: 12, templateName: "pt_daily_schedule_afternoon", triggerLabel: "pt_schedule_afternoon" },
    { triggerHour: 18, fromHour: 18, templateName: "pt_daily_schedule_evening", triggerLabel: "pt_schedule_evening" },
  ] as const

  for (const config of scheduleConfigs) {
    try {
      const now = new Date()
      const sgtHour = getSGTHour(now)
      const sgtMinute = new Date(now.getTime() + 8 * 60 * 60 * 1000).getUTCMinutes()

      // Only fire on the :00 run (not :30) to prevent duplicates from the */30 cron
      if (sgtHour === config.triggerHour && sgtMinute < 30) {
        const todaySGT = getSGTDateString(now)
        // Use SGT timezone offset so the query window covers the full SGT day
        const dayStart = `${todaySGT}T00:00:00+08:00`
        const dayEnd = `${todaySGT}T23:59:59+08:00`

        const { data: todayBookings } = await supabase
          .from("bookings")
          .select(`
            id, date_time, session_type, status, trainer_id,
            clients(first_name, last_name),
            profiles:trainer_id(name, whatsapp_number)
          `)
          .gte("date_time", dayStart)
          .lte("date_time", dayEnd)

        const byTrainer = new Map<string, NonNullable<typeof todayBookings>>()
        for (const b of todayBookings ?? []) {
          const tid = b.trainer_id
          if (!byTrainer.has(tid)) byTrainer.set(tid, [])
          byTrainer.get(tid)!.push(b)
        }

        for (const [, trainerBookings] of byTrainer) {
          if (!trainerBookings || trainerBookings.length === 0) continue
          try {
            const first = trainerBookings[0]
            const profile = first.profiles as unknown as { name: string; whatsapp_number: string }
            if (!profile?.whatsapp_number) continue

            const trainerFirstName = profile.name.split(" ")[0] || profile.name

            const sgtDate = new Date(now.getTime() + 8 * 60 * 60 * 1000)
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
            const dateStr = `${dayNames[sgtDate.getUTCDay()]}, ${sgtDate.getUTCDate()} ${monthNames[sgtDate.getUTCMonth()]}`

            const { sessionList, remainingCount, cancelledNote } = buildSchedulePayload(
              trainerBookings.map((b) => ({
                date_time: b.date_time as string,
                session_type: b.session_type as string,
                status: b.status as string,
                clients: b.clients as unknown as { first_name: string; last_name: string } | null,
              })),
              config.fromHour,
            )

            const result = await sendTemplateMessage({
              whatsappNumber: profile.whatsapp_number,
              templateName: config.templateName,
              parameters: [
                { name: "trainer_name", value: trainerFirstName },
                { name: "date", value: dateStr },
                { name: "session_list", value: sessionList },
                { name: "session_count", value: String(remainingCount) },
                { name: "cancelled_note", value: cancelledNote },
              ],
            })

            if (result.success) {
              if (config.triggerHour === 6) trigger12Count++
              else if (config.triggerHour === 12) trigger13Count++
              else trigger14Count++
            } else {
              errorLog.push({
                trigger: config.triggerLabel,
                itemId: first.trainer_id,
                error: result.error || "Send failed",
              })
            }
          } catch (err) {
            const first = trainerBookings[0]
            errorLog.push({
              trigger: config.triggerLabel,
              itemId: first?.trainer_id ?? "unknown",
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }
      }
    } catch (err) {
      errorLog.push({
        trigger: config.triggerLabel,
        itemId: "query",
        error: err instanceof Error ? err.message : String(err),
      })
    }
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
      chase_1h: trigger9Count,
      payment_reminder: trigger10Count,
      client_lapsed: trigger11Count,
      pt_schedule_morning: trigger12Count,
      pt_schedule_afternoon: trigger13Count,
      pt_schedule_evening: trigger14Count,
    },
    errors: errorLog.length > 0 ? errorLog : undefined,
    ran_at: new Date().toISOString(),
  })
}
