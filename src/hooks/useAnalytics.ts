"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface TopClient {
  client_id: string;
  client_name: string;
  session_count: number;
}

export interface AnalyticsData {
  monthlyRevenue: number;
  sessionsCompleted: number;
  noShowCount: number;
  noShowRate: number;
  outstandingTotal: number;
  activeClientsCount: number;
  packageRenewalRate: number | null;
  topClients: TopClient[];
}

export function useAnalytics() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      const now = new Date();
      const sgtOffset = 8 * 60;
      const sgtTime = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000);
      const monthStr = sgtTime.toISOString().split("T")[0].slice(0, 7);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const [
        completedResult,
        noShowResult,
        revenueResult,
        outstandingResult,
        activeClientsResult,
        packagesCompletedResult,
        packagesCreatedResult,
      ] = await Promise.all([
        // Completed bookings this month (with client names)
        supabase
          .from("bookings")
          .select("id, client_id, clients(first_name, last_name)")
          .eq("status", "completed")
          .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
          .lte("date_time", `${monthStr}-31T23:59:59+08:00`),

        // No-show bookings this month
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in("status", ["no-show", "no_show"])
          .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
          .lte("date_time", `${monthStr}-31T23:59:59+08:00`),

        // Revenue received this month
        supabase
          .from("payments")
          .select("amount")
          .eq("status", "received")
          .gte("received_date", `${monthStr}-01`)
          .lte("received_date", `${monthStr}-31`),

        // Outstanding payments
        supabase
          .from("payments")
          .select("amount")
          .in("status", ["pending", "overdue"]),

        // Active clients
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),

        // Packages completed in last 90 days
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("created_at", ninetyDaysAgo),

        // Packages created in last 90 days
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", ninetyDaysAgo),
      ]);

      const completedBookings = completedResult.data ?? [];
      const sessionsCompleted = completedBookings.length;
      const noShowCount = noShowResult.count ?? 0;
      const totalSessions = sessionsCompleted + noShowCount;
      const noShowRate = totalSessions > 0
        ? Math.round((noShowCount / totalSessions) * 100)
        : 0;

      const monthlyRevenue = (revenueResult.data ?? []).reduce(
        (sum, p) => sum + p.amount, 0
      );
      const outstandingTotal = (outstandingResult.data ?? []).reduce(
        (sum, p) => sum + p.amount, 0
      );

      const packagesCompleted = packagesCompletedResult.count ?? 0;
      const packagesCreated = packagesCreatedResult.count ?? 0;
      const packageRenewalRate = packagesCreated > 0
        ? Math.round((packagesCompleted / packagesCreated) * 100)
        : null;

      // Top 5 clients by sessions completed this month
      const clientCounts = new Map<string, { name: string; count: number }>();
      for (const b of completedBookings) {
        const client = b.clients as unknown as { first_name: string; last_name: string } | null;
        const name = client ? `${client.first_name} ${client.last_name}`.trim() : "Unknown";
        const existing = clientCounts.get(b.client_id);
        if (existing) {
          existing.count++;
        } else {
          clientCounts.set(b.client_id, { name, count: 1 });
        }
      }

      const topClients: TopClient[] = Array.from(clientCounts.entries())
        .map(([id, { name, count }]) => ({
          client_id: id,
          client_name: name,
          session_count: count,
        }))
        .sort((a, b) => b.session_count - a.session_count)
        .slice(0, 5);

      return {
        monthlyRevenue,
        sessionsCompleted,
        noShowCount,
        noShowRate,
        outstandingTotal,
        activeClientsCount: activeClientsResult.count ?? 0,
        packageRenewalRate,
        topClients,
      };
    },
  });
}
