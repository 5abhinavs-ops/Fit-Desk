import { describe, it, expect } from "vitest"
import { isDashboardEmpty, type DashboardEmptyInput } from "../dashboard-empty"

function makeData(overrides: Partial<DashboardEmptyInput> = {}): DashboardEmptyInput {
  return {
    todayBookingsCount: 0,
    outstandingPayments: 0,
    pendingPaymentConfirmations: 0,
    monthlyRevenue: 0,
    sessionsThisWeek: 0,
    overdueTotal: 0,
    attendanceRate: null,
    lowSessionClients: [],
    lapsedClients: [],
    ...overrides,
  }
}

describe("isDashboardEmpty", () => {
  it("returns false when data is undefined (still loading)", () => {
    expect(isDashboardEmpty(undefined)).toBe(false)
  })

  it("returns false when data is null", () => {
    expect(isDashboardEmpty(null)).toBe(false)
  })

  it("returns true for a brand-new PT with zero everything and null attendance", () => {
    expect(isDashboardEmpty(makeData())).toBe(true)
  })

  it("returns false when attendanceRate is a real number (0 or above)", () => {
    expect(isDashboardEmpty(makeData({ attendanceRate: 0 }))).toBe(false)
    expect(isDashboardEmpty(makeData({ attendanceRate: 100 }))).toBe(false)
  })

  it("returns false when today has any bookings", () => {
    expect(isDashboardEmpty(makeData({ todayBookingsCount: 1 }))).toBe(false)
  })

  it("returns false when outstandingPayments > 0", () => {
    expect(isDashboardEmpty(makeData({ outstandingPayments: 100 }))).toBe(false)
  })

  it("returns false when monthlyRevenue > 0", () => {
    expect(isDashboardEmpty(makeData({ monthlyRevenue: 500 }))).toBe(false)
  })

  it("returns false when sessionsThisWeek > 0", () => {
    expect(isDashboardEmpty(makeData({ sessionsThisWeek: 2 }))).toBe(false)
  })

  it("returns false when overdueTotal > 0", () => {
    expect(isDashboardEmpty(makeData({ overdueTotal: 1 }))).toBe(false)
  })

  it("returns false when pendingPaymentConfirmations > 0", () => {
    expect(isDashboardEmpty(makeData({ pendingPaymentConfirmations: 1 }))).toBe(
      false
    )
  })

  it("returns false when there are lowSessionClients", () => {
    expect(
      isDashboardEmpty(
        makeData({
          lowSessionClients: [
            {
              client_id: "c1",
              client_name: "Alex",
              sessions_remaining: 1,
              package_name: "Starter",
            },
          ],
        })
      )
    ).toBe(false)
  })

  it("returns false when there are lapsed clients", () => {
    expect(
      isDashboardEmpty(
        makeData({
          lapsedClients: [
            {
              client_id: "c2",
              client_name: "Bella",
              days_since_last_session: 20,
            },
          ],
        })
      )
    ).toBe(false)
  })
})
