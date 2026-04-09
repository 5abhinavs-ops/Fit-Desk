"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Client, Profile } from "@/types/database"

export type ClientWithTrainer = Client & {
  trainer: Pick<
    Profile,
    | "id"
    | "name"
    | "photo_url"
    | "whatsapp_number"
    | "paynow_number"
    | "paynow_details"
    | "bank_name"
    | "bank_account_number"
    | "bank_account_name"
    | "payment_link"
    | "cancellation_policy_hours"
    | "booking_slug"
  >
}

export function useClientIdentity() {
  const supabase = createClient()

  return useQuery({
    queryKey: ["client-identity"],
    queryFn: async (): Promise<ClientWithTrainer> => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { data: client, error } = await supabase
        .from("clients")
        .select(
          `*, trainer:profiles!trainer_id(
            id, name, photo_url, whatsapp_number,
            paynow_number, paynow_details,
            bank_name, bank_account_number, bank_account_name,
            payment_link, cancellation_policy_hours, booking_slug
          )`
        )
        .eq("auth_user_id", user.id)
        .single()

      if (error || !client) throw new Error("Client not found")

      const typed = client as unknown as ClientWithTrainer
      if (!typed.trainer) throw new Error("Trainer not found")

      return typed
    },
  })
}
