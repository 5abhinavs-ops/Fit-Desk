export interface DashboardEmptyInput {
  todayBookingsCount: number
  outstandingPayments: number
  pendingPaymentConfirmations: number
  monthlyRevenue: number
  sessionsThisWeek: number
  overdueTotal: number
  attendanceRate: number | null
  lowSessionClients: ReadonlyArray<unknown>
  lapsedClients: ReadonlyArray<unknown>
}

// Brand-new PT: every stat is zero AND attendanceRate is null (no bookings
// have resolved yet). A numeric attendanceRate of 0 means real no-shows have
// landed — that PT has data, just bad data, and should see real stat cards.
export function isDashboardEmpty(
  data: DashboardEmptyInput | null | undefined
): boolean {
  if (data == null) return false
  return (
    data.todayBookingsCount === 0 &&
    data.outstandingPayments === 0 &&
    data.pendingPaymentConfirmations === 0 &&
    data.monthlyRevenue === 0 &&
    data.sessionsThisWeek === 0 &&
    data.overdueTotal === 0 &&
    data.attendanceRate === null &&
    data.lowSessionClients.length === 0 &&
    data.lapsedClients.length === 0
  )
}
