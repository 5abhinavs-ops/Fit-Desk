import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/twilio"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let paymentId: string
  try {
    const body = await request.json()
    paymentId = body.paymentId
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 })

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, clients(first_name, whatsapp_number), profiles(name, paynow_details)")
    .eq("id", paymentId)
    .eq("trainer_id", user.id)
    .single()

  if (error || !payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

  const client = payment.clients as unknown as { first_name: string; whatsapp_number: string }
  const trainer = payment.profiles as unknown as { name: string; paynow_details: string | null }

  const result = await sendTemplateMessage({
    whatsappNumber: client.whatsapp_number,
    templateName: "payment_reminder_manual",
    parameters: [
      { name: "client_name", value: client.first_name },
      { name: "amount", value: `$${payment.amount}` },
      { name: "trainer_name", value: trainer.name },
      { name: "paynow_details", value: trainer.paynow_details || "contact your trainer" },
    ],
  })

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ success: true })
}
