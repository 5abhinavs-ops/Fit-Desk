const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!
const BASE_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`

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
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { success: false, error: "WhatsApp Cloud API not configured" }
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
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    })

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
