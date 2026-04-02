"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
  todayBookingsCount: number;
  outstandingPayments: number;
  pendingPaymentConfirmations: number;
  lowSessionClients: Array<{
    client_id: string;
    client_name: string;
    sessions_remaining: number;
    package_name: string;
  }>;
}

export function useDashboard() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardStats> => {
      // Use SGT date (UTC+8) for Singapore PTs
      const now = new Date();
      const sgtOffset = 8 * 60;
      const sgtTime = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000);
      const today = sgtTime.toISOString().split("T")[0];

      // Fetch today's bookings, outstanding payments, and low-session packages in parallel
      const [bookingsResult, paymentsResult, packagesResult, pendingConfirmResult] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .gte("date_time", `${today}T00:00:00+08:00`)
            .lte("date_time", `${today}T23:59:59+08:00`)
            .in("status", ["confirmed", "pending", "upcoming"]),

          supabase
            .from("payments")
            .select("amount")
            .in("status", ["pending", "overdue"])
            .order("created_at", { ascending: false })
            .limit(200),

          supabase
            .from("packages")
            .select("id, name, total_sessions, sessions_used, client_id, clients(first_name, last_name)")
            .eq("status", "active")
            .limit(100),

          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("payment_status", "client_confirmed"),
        ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (packagesResult.error) throw packagesResult.error;

      const outstandingPayments = (paymentsResult.data ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const lowSessionClients = (packagesResult.data ?? [])
        .filter((pkg) => pkg.total_sessions - pkg.sessions_used <= 2)
        .map((pkg) => {
          const client = pkg.clients as unknown as { first_name: string; last_name: string } | null;
          return {
            client_id: pkg.client_id,
            client_name: client
              ? `${client.first_name} ${client.last_name}`
              : "Unknown",
            sessions_remaining: pkg.total_sessions - pkg.sessions_used,
            package_name: pkg.name,
          };
        });

      return {
        todayBookingsCount: bookingsResult.count ?? 0,
        outstandingPayments,
        pendingPaymentConfirmations: pendingConfirmResult.count ?? 0,
        lowSessionClients,
      };
    },
  });
}
