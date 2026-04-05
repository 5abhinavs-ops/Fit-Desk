"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { PTWorkingHours, PTBlockedSlot, PTOpenSlot, PTDateSlotOverride } from "@/types/database"

export function useWorkingHours() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["working-hours"],
    queryFn: async (): Promise<PTWorkingHours[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("pt_working_hours")
        .select("*")
        .eq("trainer_id", user.id)
        .order("day_of_week")
      if (error) throw error
      return data ?? []
    },
  })
}

export function useBlockedSlots() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["blocked-slots"],
    queryFn: async (): Promise<PTBlockedSlot[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const today = new Date().toISOString().split("T")[0]
      const { data, error } = await supabase
        .from("pt_blocked_slots")
        .select("*")
        .eq("trainer_id", user.id)
        .gte("date", today)
        .order("date")
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveWorkingHours() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (hours: Array<{
      day_of_week: number
      start_time: string
      end_time: string
      is_active: boolean
    }>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const rows = hours.map((h) => ({ ...h, trainer_id: user.id }))
      const { error } = await supabase
        .from("pt_working_hours")
        .upsert(rows, { onConflict: "trainer_id,day_of_week" })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["working-hours"] })
    },
  })
}

export function useAddBlockedSlot() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (slot: {
      date: string
      start_time?: string
      end_time?: string
      reason?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_blocked_slots")
        .insert({ ...slot, trainer_id: user.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
    },
  })
}

export function useDeleteBlockedSlot() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_blocked_slots")
        .delete()
        .eq("id", id)
        .eq("trainer_id", user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
    },
  })
}

/**
 * Returns an array of "YYYY-MM-DD" strings for full-day blocks
 * (where start_time IS NULL) from today onwards.
 */
export function useBlockedDays() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["blocked-days"],
    queryFn: async (): Promise<string[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const today = new Date().toISOString().split("T")[0]
      const { data, error } = await supabase
        .from("pt_blocked_slots")
        .select("date")
        .eq("trainer_id", user.id)
        .is("start_time", null)
        .gte("date", today)
        .order("date")
      if (error) throw error
      return (data ?? []).map((row) => row.date)
    },
  })
}

export function useBlockDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch("/api/bookings/block-day", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to block day")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-days"] })
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["weekBookings"] })
    },
  })
}

export function useUnblockDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch("/api/bookings/block-day", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to unblock day")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-days"] })
      queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["weekBookings"] })
    },
  })
}

// ============================================================
// Open Slots (weekly defaults)
// ============================================================

export function useOpenSlots() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["open-slots"],
    queryFn: async (): Promise<PTOpenSlot[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("pt_open_slots")
        .select("*")
        .eq("trainer_id", user.id)
        .order("day_of_week")
        .order("start_time")
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveOpenSlot() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (slot: {
      day_of_week: number
      start_time: string
      duration_mins: number
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_open_slots")
        .upsert(
          { ...slot, trainer_id: user.id },
          { onConflict: "trainer_id,day_of_week,start_time" },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-slots"] })
    },
  })
}

export function useDeleteOpenSlot() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_open_slots")
        .delete()
        .eq("id", id)
        .eq("trainer_id", user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-slots"] })
    },
  })
}

// ============================================================
// Date Slot Overrides (per-date add/remove)
// ============================================================

export function useDateOverrides(date: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["date-overrides", date],
    enabled: !!date,
    queryFn: async (): Promise<PTDateSlotOverride[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase
        .from("pt_date_slot_overrides")
        .select("*")
        .eq("trainer_id", user.id)
        .eq("date", date)
        .order("start_time")
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddDateOverride() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (override: {
      date: string
      start_time: string
      duration_mins?: number
      is_removed: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_date_slot_overrides")
        .upsert(
          { ...override, trainer_id: user.id },
          { onConflict: "trainer_id,date,start_time" },
        )
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["date-overrides", variables.date] })
    },
  })
}

export function useDeleteDateOverride() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; date: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { error } = await supabase
        .from("pt_date_slot_overrides")
        .delete()
        .eq("id", params.id)
        .eq("trainer_id", user.id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["date-overrides", variables.date] })
    },
  })
}
