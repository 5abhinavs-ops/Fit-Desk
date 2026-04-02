"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { NutritionLog } from "@/types/database"

export function useNutritionLogs(clientId: string, date?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["nutrition-logs", clientId, date],
    queryFn: async (): Promise<NutritionLog[]> => {
      let query = supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("logged_at", { ascending: false })

      if (date) {
        query = query
          .gte("logged_at", `${date}T00:00:00+08:00`)
          .lte("logged_at", `${date}T23:59:59+08:00`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!clientId,
  })
}

export function useNutritionLogsByDateRange(
  clientId: string,
  startDate: string,
  endDate: string,
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["nutrition-logs", clientId, startDate, endDate],
    queryFn: async (): Promise<NutritionLog[]> => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", clientId)
        .gte("logged_at", `${startDate}T00:00:00+08:00`)
        .lte("logged_at", `${endDate}T23:59:59+08:00`)
        .order("logged_at", { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!clientId && !!startDate && !!endDate,
  })
}
