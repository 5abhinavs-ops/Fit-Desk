import { z } from "zod"

const httpsOnlyUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), {
    message: "photo_url must use https",
  })

export const nutritionLogSchema = z.object({
  photo_url: httpsOnlyUrl.nullable().optional(),
  meal_name: z.string().min(1),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.number().int().min(0).nullable().optional(),
  protein_g: z.number().min(0).nullable().optional(),
  carbs_g: z.number().min(0).nullable().optional(),
  fat_g: z.number().min(0).nullable().optional(),
  // Cap to a few kilobytes. The legitimate flow echoes the Claude analyse
  // response back from the client, but we never need more than a paragraph of
  // JSON — a cap blocks bulk persistence via this endpoint.
  ai_raw_response: z.string().max(4000).nullable().optional(),
  logged_at: z.string().datetime().optional(),
})

export type NutritionLogInput = z.infer<typeof nutritionLogSchema>
