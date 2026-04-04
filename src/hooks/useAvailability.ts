"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { PTWorkingHours, PTBlockedSlot } from "@/types/database"

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
