"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface TopClient {
  client_id: string;
  client_name: string;
  session_count: number;
}

interface ClientRevenue {
  client_id: string;
  client_name: string;
  paid_this_month: number;
  outstanding: number;
}

interface MonthlyRevenuePoint {
  month: string;
  year: number;
  amount: number;
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
  clientRevenue: ClientRevenue[];
  revenueHistory: MonthlyRevenuePoint[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

      // Calculate 6 months ago for history
      const sixMonthsAgo = new Date(sgtTime);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const historyStart = sixMonthsAgo.toISOString().split("T")[0];

      const [
        completedResult,
        noShowResult,
        revenueResult,
        outstandingResult,
        activeClientsResult,
        packagesCompletedResult,
        packagesCreatedResult,
        clientRevenuePaidResult,
        clientRevenueOutstandingResult,
        historyResult,
      ] = await Promise.all([
        // 0: Completed bookings this month (with client names)
        supabase
          .from("bookings")
          .select("id, client_id, clients(first_name, last_name)")
          .eq("status", "completed")
          .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
          .lte("date_time", `${monthStr}-31T23:59:59+08:00`),

        // 1: No-show bookings this month
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in("status", ["no-show", "no_show"])
          .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
          .lte("date_time", `${monthStr}-31T23:59:59+08:00`),

        // 2: Revenue received this month
        supabase
          .from("payments")
          .select("amount")
          .eq("status", "received")
          .gte("received_date", `${monthStr}-01`)
          .lte("received_date", `${monthStr}-31`),

        // 3: Outstanding payments
        supabase
          .from("payments")
          .select("amount")
          .in("status", ["pending", "overdue"]),

        // 4: Active clients
        supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),

        // 5: Packages completed in last 90 days
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("created_at", ninetyDaysAgo),

        // 6: Packages created in last 90 days
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .gte("created_at", ninetyDaysAgo),

        // 7: Per-client revenue this month (received payments)
        supabase
          .from("payments")
          .select("amount, client_id, clients(first_name, last_name)")
          .eq("status", "received")
          .gte("received_date", `${monthStr}-01`)
          .lte("received_date", `${monthStr}-31`),

        // 8: Per-client outstanding (pending + overdue)
        supabase
          .from("payments")
          .select("amount, client_id, clients(first_name, last_name)")
          .in("status", ["pending", "overdue"]),

        // 9: Last 6 months revenue history
        supabase
          .from("payments")
          .select("amount, received_date")
          .eq("status", "received")
          .gte("received_date", historyStart)
          .lte("received_date", `${monthStr}-31`),
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

      // Build clientRevenue — combine paid this month + outstanding per client
      const clientRevenuePaid = clientRevenuePaidResult.data ?? [];
      const clientRevenueOutstanding = clientRevenueOutstandingResult.data ?? [];

      const clientRevenueMap = new Map<string, ClientRevenue>();

      for (const p of clientRevenuePaid) {
        const client = p.clients as unknown as { first_name: string; last_name: string } | null;
        const name = client ? `${client.first_name} ${client.last_name}`.trim() : "Unknown";
        const existing = clientRevenueMap.get(p.client_id);
        if (existing) {
          clientRevenueMap.set(p.client_id, { ...existing, paid_this_month: existing.paid_this_month + p.amount });
        } else {
          clientRevenueMap.set(p.client_id, {
            client_id: p.client_id,
            client_name: name,
            paid_this_month: p.amount,
            outstanding: 0,
          });
        }
      }

      for (const p of clientRevenueOutstanding) {
        const client = p.clients as unknown as { first_name: string; last_name: string } | null;
        const name = client ? `${client.first_name} ${client.last_name}`.trim() : "Unknown";
        const existing = clientRevenueMap.get(p.client_id);
        if (existing) {
          clientRevenueMap.set(p.client_id, { ...existing, outstanding: existing.outstanding + p.amount });
        } else {
          clientRevenueMap.set(p.client_id, {
            client_id: p.client_id,
            client_name: name,
            paid_this_month: 0,
            outstanding: p.amount,
          });
        }
      }

      const clientRevenue = Array.from(clientRevenueMap.values())
        .filter((c) => c.paid_this_month > 0 || c.outstanding > 0)
        .sort((a, b) => b.paid_this_month - a.paid_this_month);

      // Build revenueHistory — group by month
      const historyMap = new Map<string, MonthlyRevenuePoint>();

      // Pre-populate last 6 months with 0
      for (let i = 5; i >= 0; i--) {
        const d = new Date(sgtTime);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        historyMap.set(key, {
          month: MONTH_NAMES[d.getMonth()],
          year: d.getFullYear(),
          amount: 0,
        });
      }

      for (const p of historyResult.data ?? []) {
        if (!p.received_date) continue;
        const key = p.received_date.slice(0, 7); // "YYYY-MM"
        const existing = historyMap.get(key);
        if (existing) {
          historyMap.set(key, { ...existing, amount: existing.amount + p.amount });
        }
      }

      const revenueHistory = Array.from(historyMap.values());

      return {
        monthlyRevenue,
        sessionsCompleted,
        noShowCount,
        noShowRate,
        outstandingTotal,
        activeClientsCount: activeClientsResult.count ?? 0,
        packageRenewalRate,
        topClients,
        clientRevenue,
        revenueHistory,
      };
    },
  });
}
