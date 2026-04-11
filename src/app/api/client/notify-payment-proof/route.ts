import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendTemplateMessage } from "@/lib/whatsapp"

const NotifySchema = z.object({
  payment_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = NotifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Verify payment belongs to this client — fetch DB values for notification
  const serviceClient = createServiceClient()
  const { data: payment } = await serviceClient
    .from("payments")
    .select(
      "id, amount, trainer_id, client_id, clients!inner(auth_user_id, first_name, last_name)"
    )
    .eq("id", parsed.data.payment_id)
    .single()

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  const paymentClient = payment.clients as unknown as {
    auth_user_id: string | null
    first_name: string
    last_name: string
  }
  if (paymentClient.auth_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Use DB values only — never trust request body for amount or name
  const clientName = `${paymentClient.first_name} ${paymentClient.last_name}`.trim()

  // Get PT's WhatsApp number
  const { data: trainer } = await serviceClient
    .from("profiles")
    .select("whatsapp_number")
    .eq("id", payment.trainer_id)
    .single()

  if (trainer?.whatsapp_number) {
    await sendTemplateMessage({
      whatsappNumber: trainer.whatsapp_number,
      templateName: "client_uploaded_proof",
      parameters: [
        { name: "1", value: clientName },
        { name: "2", value: `$${payment.amount}` },
      ],
    })
  }

  return NextResponse.json({ success: true })
}
