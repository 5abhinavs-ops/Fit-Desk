"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Package } from "@/types/database";

export function usePackages(clientId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["packages", clientId],
    queryFn: async (): Promise<Package[]> => {
      let query = supabase.from("packages").select("*").order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePackage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pkg: Omit<Package, "id" | "trainer_id" | "created_at" | "sessions_used" | "amount_paid" | "payment_status" | "status" | "last_low_session_alert_sent">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("packages").insert({
        ...pkg,
        trainer_id: user.id,
        sessions_used: 0,
        amount_paid: 0,
        payment_status: "unpaid",
        status: "active",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["packages", variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useLogSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      // Use RPC for atomic increment to avoid TOCTOU race condition.
      // Falls back to read-then-write if RPC is not available.
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc("increment_sessions_used", { p_package_id: packageId });

      if (!rpcError && rpcResult) {
        return {
          sessions_used: rpcResult.sessions_used,
          total_sessions: rpcResult.total_sessions,
        };
      }

      // Fallback: read-then-write with constraint guard
      const { data: pkg, error: fetchError } = await supabase
        .from("packages")
        .select("sessions_used, total_sessions")
        .eq("id", packageId)
        .single();

      if (fetchError) throw fetchError;

      if (pkg.sessions_used >= pkg.total_sessions) {
        throw new Error("All sessions in this package have been used");
      }

      const newSessionsUsed = pkg.sessions_used + 1;
      const newStatus =
        newSessionsUsed >= pkg.total_sessions ? "completed" : "active";

      const { error: updateError } = await supabase
        .from("packages")
        .update({
          sessions_used: newSessionsUsed,
          status: newStatus,
        })
        .eq("id", packageId);

      if (updateError) throw updateError;

      return { sessions_used: newSessionsUsed, total_sessions: pkg.total_sessions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
