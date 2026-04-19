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

interface TemplateParam {
  name: string
  value: string
}

interface SendTemplateOptions {
  whatsappNumber: string
  templateName: string
  parameters: TemplateParam[]
  languageCode?: string
}

export async function sendTemplateMessage({
  whatsappNumber,
  templateName,
  parameters,
  languageCode = "en_US",
}: SendTemplateOptions): Promise<{ success: boolean; error?: string }> {
  const config = readConfig()
  if (!config) {
    return { success: false, error: MISSING_CONFIG_MESSAGE }
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
      const error = await res.json().catch(() => ({}))
      return {
        success: false,
        error: `WhatsApp API error ${res.status}: ${JSON.stringify(error)}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    }
  }
}
