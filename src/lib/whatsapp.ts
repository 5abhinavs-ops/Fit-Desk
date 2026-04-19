import { createServiceClient } from "@/lib/supabase/service"
import { isOptOutError } from "@/lib/whatsapp-optout"

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
}

function readConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return null
  return { phoneNumberId, accessToken }
}

const MISSING_CONFIG_MESSAGE =
  "WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN (see .env.local.example)."

// Fail loudly in production if WhatsApp isn't configured — a silent
// degraded mode has caused the reminder pipeline to drop messages with
// no observable failure in the past.
if (process.env.NODE_ENV === "production" && !readConfig()) {
  throw new Error(MISSING_CONFIG_MESSAGE)
}

export function assertWhatsAppConfig(): WhatsAppConfig {
  const config = readConfig()
  if (!config) {
    throw new Error(MISSING_CONFIG_MESSAGE)
  }
  return config
}

export interface TemplateParam {
  name: string
  value: string
}

interface SendTemplateOptions {
  whatsappNumber: string
  templateName: string
  parameters: TemplateParam[]
  languageCode?: string
  // Phase L — supply both to enable per-client opt-out suppression and
  // audit logging in whatsapp_logs. Omit for test fixtures or contexts
  // that don't have trainer/client identity (e.g. future inbound webhooks).
  trainerId?: string
  clientId?: string
}

export type SendTemplateResult =
  | { success: true }
  | { success: false; error?: string; reason?: "opted_out" | "api_error" | "config_missing" }

// Log a send attempt. Fire-and-forget — logging infra must not take down
// the messaging pipeline. Requires trainerId; clientId is optional for
// PT-facing messages (e.g. new_booking_request).
async function logSend(
  trainerId: string,
  clientId: string | null,
  templateName: string,
  status: "sent" | "suppressed_opt_out" | "failed"
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from("whatsapp_logs").insert({
      trainer_id: trainerId,
      client_id: clientId,
      template_name: templateName,
      status,
    })
  } catch (err) {
    console.error("whatsapp_logs insert failed", err)
  }
}

async function isClientOptedOut(clientId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("clients")
      .select("whatsapp_opted_out")
      .eq("id", clientId)
      .single()
    return data?.whatsapp_opted_out === true
  } catch {
    // If the lookup fails, do NOT suppress — err on the side of attempting
    // the send so legitimate messages aren't dropped by a transient DB
    // blip. A real opt-out will be re-detected on the send response.
    return false
  }
}

async function markClientOptedOut(
  clientId: string,
  trainerId?: string
): Promise<void> {
  try {
    const supabase = createServiceClient()
    // Defense-in-depth: scope the write to (clientId, trainerId) whenever
    // trainerId is known, so a future caller that passes an externally-
    // supplied clientId can't flip flags on another trainer's client.
    let query = supabase
      .from("clients")
      .update({ whatsapp_opted_out: true })
      .eq("id", clientId)
    if (trainerId) {
      query = query.eq("trainer_id", trainerId)
    }
    await query
  } catch (err) {
    console.error("clients.whatsapp_opted_out update failed", err)
  }
}

export async function sendTemplateMessage({
  whatsappNumber,
  templateName,
  parameters,
  languageCode = "en_US",
  trainerId,
  clientId,
}: SendTemplateOptions): Promise<SendTemplateResult> {
  const config = readConfig()
  if (!config) {
    return { success: false, error: MISSING_CONFIG_MESSAGE, reason: "config_missing" }
  }

  // Suppress sends to opted-out clients BEFORE hitting the Meta API.
  // clientId alone is enough to suppress — logging happens only when
  // trainerId is also present (log attribution rows require trainer_id).
  if (clientId && (await isClientOptedOut(clientId))) {
    if (trainerId) {
      await logSend(trainerId, clientId, templateName, "suppressed_opt_out")
    }
    return { success: false, reason: "opted_out" }
  }

  // Normalise number — strip whatsapp: prefix, leading +/0, ensure clean digits
  const to = whatsappNumber
    .replace(/^whatsapp:/i, "")
    .replace(/\s/g, "")
    .replace(/^[+0]+/, "")

  // Build component parameters
  const components =
    parameters.length > 0
      ? [
          {
            type: "body" as const,
            parameters: parameters.map((p) => ({
              type: "text" as const,
              text: p.value,
            })),
          },
        ]
      : []

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 && { components }),
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify(body),
      }
    )

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => ({}))

      // Detect opt-out signals from Meta and persist the flag on the
      // client row so future sends are suppressed before the API hop.
      if (clientId && isOptOutError(errorPayload)) {
        await markClientOptedOut(clientId, trainerId)
        if (trainerId) {
          await logSend(trainerId, clientId, templateName, "suppressed_opt_out")
        }
        return { success: false, reason: "opted_out" }
      }

      if (trainerId) {
        await logSend(trainerId, clientId ?? null, templateName, "failed")
      }
      return {
        success: false,
        reason: "api_error",
        error: `WhatsApp API error ${res.status}: ${JSON.stringify(errorPayload)}`,
      }
    }

    if (trainerId) {
      await logSend(trainerId, clientId ?? null, templateName, "sent")
    }
    return { success: true }
  } catch (error) {
    if (trainerId) {
      await logSend(trainerId, clientId ?? null, templateName, "failed")
    }
    return {
      success: false,
      reason: "api_error",
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    }
  }
}
