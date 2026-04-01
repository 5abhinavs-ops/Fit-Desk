"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Booking, BookingStatus } from "@/types/database";

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
        // Filter bookings for a specific day in Asia/Singapore timezone (UTC+8)
        const startOfDay = `${date}T00:00:00+08:00`;
        const endOfDay = `${date}T23:59:59+08:00`;
        query = query.gte("date_time", startOfDay).lte("date_time", endOfDay);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayBookings() {
  // Use SGT date (UTC+8) to get the correct "today" for Singapore PTs
  const now = new Date();
  const sgtOffset = 8 * 60; // minutes
  const sgtTime = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000);
  const today = sgtTime.toISOString().split("T")[0];
  return useBookings(today);
}

export function useCreateBooking() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (booking: Omit<Booking, "id" | "trainer_id" | "created_at" | "reminder_24h_sent" | "reminder_1h_sent">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("bookings").insert({
        ...booking,
        trainer_id: user.id,
        reminder_24h_sent: false,
        reminder_1h_sent: false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBookingStatus() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
