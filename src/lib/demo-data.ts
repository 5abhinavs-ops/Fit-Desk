export const DEMO_DASHBOARD_DATA = {
  todayBookingsCount: 3,
  outstandingPayments: 420,
  pendingPaymentConfirmations: 1,
  monthlyRevenue: 2800,
  sessionsThisWeek: 8,
  overdueTotal: 150,
  attendanceRate: 92,
  lowSessionClients: [
    { client_id: "demo-1", client_name: "Sarah Tan", sessions_remaining: 2, package_name: "10-Session Pack" },
    { client_id: "demo-2", client_name: "Marcus Lee", sessions_remaining: 1, package_name: "5-Session Pack" },
  ],
  lapsedClients: [
    { client_id: "demo-3", client_name: "Priya Nair", days_since_last_session: 18 },
  ],
} as const
