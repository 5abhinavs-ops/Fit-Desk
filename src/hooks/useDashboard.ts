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
  monthlyRevenue: number;
  /** Sum of received payments in the previous calendar month (SGT). */
  priorMonthRevenue: number;
  /**
   * When true, show MoM trend vs last month. Requires prior-month received
   * revenue so we never imply a comparison without a real baseline (and we
   * never show 0 vs 0).
   */
  showRevenueMomTrend: boolean;
  sessionsThisWeek: number;
  overdueTotal: number;
  attendanceRate: number | null;
  lapsedClients: Array<{
    client_id: string;
    client_name: string;
    days_since_last_session: number;
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

      // Calculate SGT week boundaries (Mon 00:00 to Sun 23:59)
      const sgtDay = sgtTime.getDay(); // 0=Sun, 1=Mon...
      const mondayOffset = sgtDay === 0 ? -6 : 1 - sgtDay;
      const weekStart = new Date(sgtTime);
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const monthStr = today.slice(0, 7); // YYYY-MM
      const [yStr, mStr] = monthStr.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      const prevMonthStr =
        m === 1
          ? `${y - 1}-12`
          : `${y}-${String(m - 1).padStart(2, "0")}`;

      // Fetch all dashboard data in parallel
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [bookingsResult, paymentsResult, packagesResult, pendingConfirmResult,
             revenueResult, priorMonthRevenueResult, weekSessionsResult, overdueResult, attendanceResult, lapsedResult] =
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

          // Monthly revenue
          supabase
            .from("payments")
            .select("amount")
            .eq("status", "received")
            .gte("received_date", `${monthStr}-01`)
            .lte("received_date", `${monthStr}-31`),

          // Prior month revenue (same query shape for MoM trend)
          supabase
            .from("payments")
            .select("amount")
            .eq("status", "received")
            .gte("received_date", `${prevMonthStr}-01`)
            .lte("received_date", `${prevMonthStr}-31`),

          // Sessions this week
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .gte("date_time", weekStart.toISOString())
            .lte("date_time", weekEnd.toISOString()),

          // Overdue total
          supabase
            .from("payments")
            .select("amount")
            .eq("status", "overdue"),

          // Attendance rate this month
          supabase
            .from("bookings")
            .select("status")
            .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
            .lte("date_time", `${monthStr}-31T23:59:59+08:00`)
            .in("status", ["completed", "no-show", "no_show"]),

          // Lapsed clients (no session in 14+ days)
          supabase
            .from("clients")
            .select("id, first_name, last_name, last_session_date")
            .eq("status", "active")
            .not("last_session_date", "is", null)
            .lt("last_session_date", fourteenDaysAgo)
            .limit(10),
        ]);

      if (bookingsResult.error) throw bookingsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (packagesResult.error) throw packagesResult.error;

      const outstandingPayments = (paymentsResult.data ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const lowSessionClients = (packagesResult.data ?? [])
        .filter((pkg) => {
          const remaining = pkg.total_sessions - pkg.sessions_used;
          return remaining >= 1 && remaining <= 2;
        })
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

      const monthlyRevenue = (revenueResult.data ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const priorMonthRevenue = (priorMonthRevenueResult.data ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const showRevenueMomTrend = priorMonthRevenue > 0;

      const overdueTotal = (overdueResult.data ?? []).reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const attendanceData = attendanceResult.data ?? [];
      let attendanceRate: number | null = null;
      if (attendanceData.length > 0) {
        const completed = attendanceData.filter(
          (b) => b.status === "completed"
        ).length;
        attendanceRate = Math.round((completed / attendanceData.length) * 100);
      }

      const lapsedClients = (lapsedResult.data ?? []).map((c) => ({
        client_id: c.id,
        client_name: `${c.first_name} ${c.last_name}`,
        days_since_last_session: Math.floor(
          (now.getTime() - new Date(c.last_session_date!).getTime()) / (24 * 60 * 60 * 1000)
        ),
      }));

      return {
        todayBookingsCount: bookingsResult.count ?? 0,
        outstandingPayments,
        pendingPaymentConfirmations: pendingConfirmResult.count ?? 0,
        lowSessionClients,
        monthlyRevenue,
        priorMonthRevenue,
        showRevenueMomTrend,
        sessionsThisWeek: weekSessionsResult.count ?? 0,
        overdueTotal,
        attendanceRate,
        lapsedClients,
      };
    },
  });
}
