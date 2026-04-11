import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/whatsapp"
import { checkCsrf } from "@/lib/csrf"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = checkCsrf(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { data: pkg, error } = await supabase
    .from("packages")
    .select("id, name, total_sessions, client_id, clients(first_name, last_name, whatsapp_number)")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .single()

  if (error || !pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  const client = pkg.clients as unknown as { first_name: string; last_name: string; whatsapp_number: string }
  const trainerName = profile?.name || "Your trainer"
  const clientName = `${client.first_name} ${client.last_name}`.trim()

  const result = await sendTemplateMessage({
    whatsappNumber: client.whatsapp_number,
    templateName: "package_renewal_created",
    parameters: [
      { name: "client_name", value: clientName },
      { name: "package_name", value: pkg.name },
      { name: "total_sessions", value: String(pkg.total_sessions) },
      { name: "trainer_name", value: trainerName },
    ],
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
