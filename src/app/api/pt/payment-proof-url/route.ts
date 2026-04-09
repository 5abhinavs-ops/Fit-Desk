import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const ProofUrlSchema = z.object({
  path: z.string().min(1),
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

  const parsed = ProofUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  // Reject path traversal attempts
  if (
    parsed.data.path.includes("..") ||
    parsed.data.path.includes("%2e") ||
    parsed.data.path.includes("%2f") ||
    parsed.data.path.includes("%2F")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Verify the path belongs to this PT (path starts with trainer_id/)
  if (!parsed.data.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Generate signed URL (30 days)
  const { data, error } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(parsed.data.path, 60 * 60 * 24 * 30)

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to generate URL" },
      { status: 500 }
    )
  }

  return NextResponse.json({ url: data.signedUrl })
}
