const WATI_API_URL = process.env.WATI_API_URL;
const WATI_API_TOKEN = process.env.WATI_API_TOKEN;

interface SendTemplateMessageParams {
  whatsappNumber: string;
  templateName: string;
  parameters: Array<{ name: string; value: string }>;
}

export async function sendTemplateMessage({
  whatsappNumber,
  templateName,
  parameters,
}: SendTemplateMessageParams): Promise<{ success: boolean; error?: string }> {
  if (!WATI_API_URL || !WATI_API_TOKEN) {
    return { success: false, error: "WATI API not configured" };
  }

  // Strip leading + or 0, ensure clean number format
  const cleanNumber = whatsappNumber.replace(/^[+0]+/, "");

  try {
    const response = await fetch(
      `${WATI_API_URL}/api/v1/sendTemplateMessage?whatsappNumber=${cleanNumber}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WATI_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: "fitdesk_reminder",
          parameters,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `WATI API error: ${errorData}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
