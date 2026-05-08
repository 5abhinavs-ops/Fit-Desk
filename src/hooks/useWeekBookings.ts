"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { addDays, format, startOfWeek, parseISO } from "date-fns"
import type { Booking } from "@/types/database"

/**
 * Returns the ISO date string (yyyy-MM-dd) of the Monday for a given week offset.
 * weekOffset 0 = this week, -1 = last week, +1 = next week.
 * Uses SGT (UTC+8) to determine "today".
 */
export function getWeekStart(weekOffset: number): string {
  const now = new Date()
  const sgtOffset = 8 * 60
  const sgtTime = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
  const sgtToday = new Date(sgtTime.getFullYear(), sgtTime.getMonth(), sgtTime.getDate())
  const monday = startOfWeek(sgtToday, { weekStartsOn: 1 })
  const targetMonday = addDays(monday, weekOffset * 7)
  return format(targetMonday, "yyyy-MM-dd")
}

interface UseWeekBookingsOptions {
  enabled?: boolean
}

/**
 * Fetches all bookings for a Mon–Sun week (SGT timezone).
 * Used for the week heatmap — no client join needed.
 */
export function useWeekBookings(weekStart: string, options?: UseWeekBookingsOptions) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["weekBookings", weekStart],
    enabled: options?.enabled,
    queryFn: async (): Promise<Booking[]> => {
      const sundayDate = format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd")
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .gte("date_time", `${weekStart}T00:00:00+08:00`)
        .lte("date_time", `${sundayDate}T23:59:59+08:00`)
        .order("date_time", { ascending: true })

      if (error) throw error
      return data
    },
  })
}
