"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { RecurringSchedule } from "@/types/database"

interface RecurringScheduleWithPackage extends RecurringSchedule {
  package_name: string | null
  sessions_remaining: number | null
}

export function useRecurringSchedules(clientId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["recurring-schedules", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<RecurringScheduleWithPackage[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("recurring_schedules")
        .select("*, packages(name, total_sessions, sessions_used)")
        .eq("client_id", clientId)
        .eq("trainer_id", user.id)
        .eq("active", true)
        .order("day_of_week")

      if (error) throw error

      return (data ?? []).map((row) => {
        const pkg = row.packages as unknown as {
          name: string
          total_sessions: number
          sessions_used: number
        } | null
        return {
          ...row,
          packages: undefined,
          package_name: pkg?.name ?? null,
          sessions_remaining: pkg
            ? pkg.total_sessions - pkg.sessions_used
            : null,
        } as RecurringScheduleWithPackage
      })
    },
  })
}

export function useCreateRecurringSchedule() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (schedule: {
      client_id: string
      package_id: string
      day_of_week: number
      start_time: string
      duration_mins: number
      start_date: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data, error } = await supabase
        .from("recurring_schedules")
        .insert({
          ...schedule,
          trainer_id: user.id,
          active: true,
        })
        .select()
        .single()

      if (error) throw error

      // Generate future bookings via API
      const res = await fetch("/api/bookings/generate-recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_id: data.id }),
      })

      if (!res.ok) {
        let errorMsg = "Failed to generate bookings"
        try {
          const errData = await res.json()
          if (errData.error) errorMsg = errData.error
        } catch {
          // Response was not JSON (e.g. 502 HTML page)
        }
        throw new Error(errorMsg)
      }

      return res.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules", variables.client_id] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["weekBookings"] })
      queryClient.invalidateQueries({ queryKey: ["packages", variables.client_id] })
    },
  })
}

export function useDeleteRecurringSchedule() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; clientId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("recurring_schedules")
        .update({ active: false })
        .eq("id", params.id)
        .eq("trainer_id", user.id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recurring-schedules", variables.clientId] })
    },
  })
}
