import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM

interface SendTemplateMessageParams {
  whatsappNumber: string
  templateName: string
  parameters: Array<{ name: string; value: string }>
}

/**
 * Content SID mapping — maps logical template names to Twilio Content SIDs.
 * Each Content SID corresponds to a pre-approved WhatsApp template in Twilio.
 * Add new templates here as they are created in the Twilio console.
 */
const CONTENT_SID_MAP: Record<string, string | undefined> = {
  session_reminder_24h: process.env.TWILIO_CONTENT_SID_SESSION_24H,
  session_reminder_1h: process.env.TWILIO_CONTENT_SID_SESSION_1H,
  new_booking_request: process.env.TWILIO_CONTENT_SID_NEW_BOOKING,
  package_low_sessions: process.env.TWILIO_CONTENT_SID_LOW_SESSIONS,
  payment_due_today: process.env.TWILIO_CONTENT_SID_PAYMENT_DUE,
  payment_overdue_1: process.env.TWILIO_CONTENT_SID_OVERDUE_1,
  payment_overdue_3: process.env.TWILIO_CONTENT_SID_OVERDUE_3,
  payment_overdue_7: process.env.TWILIO_CONTENT_SID_OVERDUE_7,
  payment_reminder_manual: process.env.TWILIO_CONTENT_SID_PAYMENT_MANUAL,
  booking_cancelled_restore: process.env.TWILIO_CONTENT_SID_CANCEL_RESTORE,
  booking_cancelled_forfeit: process.env.TWILIO_CONTENT_SID_CANCEL_FORFEIT,
  booking_no_show: process.env.TWILIO_CONTENT_SID_NO_SHOW,
  booking_rescheduled: process.env.TWILIO_CONTENT_SID_RESCHEDULED,
  booking_cancelled_by_client: process.env.TWILIO_CONTENT_SID_CLIENT_CANCEL,
  booking_approved: process.env.TWILIO_CONTENT_SID_BOOKING_APPROVED,
  booking_declined: process.env.TWILIO_CONTENT_SID_BOOKING_DECLINED,
  booking_pending_approval: process.env.TWILIO_CONTENT_SID_PENDING_APPROVAL,
  session_confirm_attendance: process.env.TWILIO_CONTENT_SID_CONFIRM_ATTENDANCE,
  session_running_late: process.env.TWILIO_CONTENT_SID_RUNNING_LATE,
  session_reschedule_request: process.env.TWILIO_CONTENT_SID_RESCHEDULE_REQUEST,
  session_reminder_24h_with_link: process.env.TWILIO_CONTENT_SID_SESSION_24H_LINK,
  session_chase_1h: process.env.TWILIO_CONTENT_SID_CHASE_1H,
  pt_payment_confirmed: process.env.TWILIO_CONTENT_SID_PT_PAYMENT_CONFIRMED,
  payment_reminder: process.env.TWILIO_CONTENT_SID_PAYMENT_REMINDER,
  package_renewal_created: process.env.TWILIO_CONTENT_SID_PACKAGE_RENEWAL,
  client_lapsed_alert: process.env.TWILIO_CONTENT_SID_CLIENT_LAPSED,
  session_cancelled_reschedule: process.env.TWILIO_CONTENT_SID_SESSION_CANCELLED_RESCHEDULE,
  pt_daily_schedule_morning: process.env.TWILIO_CONTENT_SID_PT_SCHEDULE_MORNING,
  pt_daily_schedule_afternoon: process.env.TWILIO_CONTENT_SID_PT_SCHEDULE_AFTERNOON,
  pt_daily_schedule_evening: process.env.TWILIO_CONTENT_SID_PT_SCHEDULE_EVENING,
}

let _client: twilio.Twilio | null = null

function getClient(): twilio.Twilio {
  if (!_client) {
    _client = twilio(accountSid, authToken)
  }
  return _client
}

export async function sendTemplateMessage({
  whatsappNumber,
  templateName,
  parameters,
}: SendTemplateMessageParams): Promise<{ success: boolean; error?: string }> {
  if (!accountSid || !authToken || !whatsappFrom) {
    return { success: false, error: "Twilio WhatsApp not configured" }
  }

  const contentSid = CONTENT_SID_MAP[templateName]
  if (!contentSid) {
    return { success: false, error: `No Content SID configured for template: ${templateName}` }
  }

  // Ensure E.164 format with whatsapp: prefix
  const cleanNumber = whatsappNumber.replace(/^[+0]+/, "")
  const to = `whatsapp:+${cleanNumber}`
  const from = whatsappFrom.startsWith("whatsapp:")
    ? whatsappFrom
    : `whatsapp:${whatsappFrom}`

  // Build content variables from parameters array
  const contentVariables: Record<string, string> = {}
  parameters.forEach((p, i) => {
    contentVariables[String(i + 1)] = p.value
  })

  try {
    const client = getClient()
    await client.messages.create({
      to,
      from,
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Twilio send failed",
    }
  }
}
