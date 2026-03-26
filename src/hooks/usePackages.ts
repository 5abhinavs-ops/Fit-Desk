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

export function useLogSession() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      // Increment sessions_used by 1
      const { data: pkg, error: fetchError } = await supabase
        .from("packages")
        .select("sessions_used, total_sessions")
        .eq("id", packageId)
        .single();

      if (fetchError) throw fetchError;

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
