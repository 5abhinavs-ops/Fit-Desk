"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Booking } from "@/types/database";

export function useBookings(date?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["bookings", date],
    queryFn: async (): Promise<Booking[]> => {
      let query = supabase
        .from("bookings")
        .select("*")
        .order("date_time", { ascending: true });

      if (date) {
        // Filter bookings for a specific day
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;
        query = query.gte("date_time", startOfDay).lte("date_time", endOfDay);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayBookings() {
  const today = new Date().toISOString().split("T")[0];
  return useBookings(today);
}
