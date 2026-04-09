"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types/database";

export function useClients() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("first_name");

      if (error) throw error;
      return data;
    },
  });
}

export function useClient(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["clients", id],
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      client: Omit<Client, "id" | "trainer_id" | "created_at" | "last_session_date" | "payment_reminder_days" | "last_reactivation_alert_sent" | "auth_user_id">
    ) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(client)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
