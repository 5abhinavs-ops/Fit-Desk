"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Payment } from "@/types/database"

export type PaymentWithClient = Payment & {
  clients: { first_name: string; last_name: string; whatsapp_number: string } | null
}

export function usePayments(status?: "pending" | "overdue" | "received") {
  const supabase = createClient()
  return useQuery({
    queryKey: ["payments", status],
    queryFn: async (): Promise<PaymentWithClient[]> => {
      let query = supabase
        .from("payments")
        .select("*, clients(first_name, last_name, whatsapp_number)")
        .order("due_date", { ascending: true })
      if (status) {
        query = query.eq("status", status)
      }
      const { data, error } = await query
      if (error) throw error
      return data as PaymentWithClient[]
    },
  })
}

export function useClientPayments(clientId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ["client-payments", clientId],
    queryFn: async (): Promise<PaymentWithClient[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(first_name, last_name, whatsapp_number)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data as PaymentWithClient[]
    },
    enabled: !!clientId,
  })
}

export function useCreatePayment() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<Payment, "id" | "trainer_id" | "created_at" | "overdue_reminder_stage">) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const { data, error } = await supabase.from("payments").insert({
        ...payment,
        trainer_id: user.id,
        overdue_reminder_stage: "none",
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["client-payments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}

export function useMarkPaymentReceived() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const today = new Date().toISOString().split("T")[0]
      const { error } = await supabase.from("payments").update({
        status: "received",
        received_date: today,
        overdue_reminder_stage: "none",
      }).eq("id", paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["client-payments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })
}
