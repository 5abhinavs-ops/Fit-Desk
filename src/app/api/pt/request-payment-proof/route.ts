import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/whatsapp"

const RequestProofSchema = z.object({
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

  const parsed = RequestProofSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Verify payment belongs to this PT
  const { data: payment } = await supabase
    .from("payments")
    .select("id, amount, client_id, clients!inner(whatsapp_number)")
    .eq("id", parsed.data.payment_id)
    .eq("trainer_id", user.id)
    .single()

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // Update proof_requested_at
  await supabase
    .from("payments")
    .update({ proof_requested_at: new Date().toISOString() })
    .eq("id", payment.id)

  // Send WhatsApp to client
  const clientData = payment.clients as unknown as {
    whatsapp_number: string
  }
  await sendTemplateMessage({
    whatsappNumber: clientData.whatsapp_number,
    templateName: "request_payment_proof",
    parameters: [{ name: "1", value: `$${payment.amount}` }],
  })

  return NextResponse.json({ success: true })
}
