import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { checkRateLimit } from "@/lib/rate-limit"
import Anthropic from "@anthropic-ai/sdk"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

// AI vision calls are expensive and slow — 1 per 10s per authenticated user.
const AI_RATE_LIMIT_WINDOW_MS = 10_000
const AI_RATE_LIMIT_MAX = 1

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = checkRateLimit(
    `nutrition-analyse:${user.id}`,
    AI_RATE_LIMIT_MAX,
    AI_RATE_LIMIT_WINDOW_MS,
  )
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a few seconds and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI analysis not configured" }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("image") as File | null
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 })
  }

  // Validate MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: JPEG, PNG, WebP, GIF" },
      { status: 400 },
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 10MB" }, { status: 400 })
  }

  // Read file as buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")

  // Upload to Supabase Storage
  const serviceClient = createServiceClient()
  const fileName = `meals/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  let photoUrl: string | null = null
  if (!uploadError && uploadData) {
    const { data: urlData } = serviceClient.storage
      .from("avatars")
      .getPublicUrl(fileName)
    photoUrl = urlData.publicUrl
  }

  // Call Claude vision API
  const anthropic = new Anthropic({ apiKey })

  try {
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif"

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `You are a nutrition expert. Analyse this food photo and estimate the nutritional content.

Respond with ONLY a JSON object in this exact format, no other text:
{
  "meal_name": "name of the meal",
  "calories": 450,
  "protein_g": 32.5,
  "carbs_g": 45.0,
  "fat_g": 12.0,
  "confidence": "high"
}

Base your estimates on standard portion sizes visible in the image.
For mixed dishes common in Singapore and Southeast Asia, use local
portion sizes (e.g. hawker centre servings).`,
          },
        ],
      }],
    })

    const textBlock = response.content.find((b) => b.type === "text")
    const rawText = textBlock && "text" in textBlock ? textBlock.text : ""

    // Parse JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({
        error: "Could not parse AI response",
        photo_url: photoUrl,
        ai_raw_response: rawText,
      }, { status: 422 })
    }

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      meal_name: parsed.meal_name || "Unknown meal",
      calories: parsed.calories ?? null,
      protein_g: parsed.protein_g ?? null,
      carbs_g: parsed.carbs_g ?? null,
      fat_g: parsed.fat_g ?? null,
      confidence: parsed.confidence || "medium",
      photo_url: photoUrl,
      ai_raw_response: rawText,
    })
  } catch (err) {
    return NextResponse.json({
      error: "AI analysis failed",
      details: err instanceof Error ? err.message : "Unknown error",
      photo_url: photoUrl,
    }, { status: 500 })
  }
}
