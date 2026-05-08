"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type StatementPayment = {
  id: string
  amount: number
  status: "received" | "client_confirmed" | "pending" | "overdue"
  method: string | null
  received_date: string | null
  due_date: string | null
  notes: string | null
}

export type StatementClient = {
  client_id: string
  client_name: string
  sessions_completed: number
  package_name: string | null
  package_total_sessions: number | null
  payments: StatementPayment[]
  total_paid_confirmed: number
  total_paid_unconfirmed: number
  total_due: number
}

export function useMonthlyStatement(month: string) {
  const supabase = createClient()

  const [yearNum, monthNum] = month.split("-").map(Number)
  const lastDay = new Date(yearNum, monthNum, 0).getDate()
  const monthStart = `${month}-01`
  const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}`

  return useQuery({
    queryKey: ["monthly-statement", month],
    queryFn: async (): Promise<StatementClient[]> => {
      const [bookingsResult, paymentsResult, clientsResult] = await Promise.all([
        // Completed bookings this month
        supabase
          .from("bookings")
          .select("id, client_id, date_time, status")
          .eq("status", "completed")
          .gte("date_time", `${monthStart}T00:00:00+08:00`)
          .lte("date_time", `${monthEnd}T23:59:59+08:00`),

        // All payments — received/client_confirmed scoped to month,
        // pending/overdue are all-time outstanding
        supabase
          .from("payments")
          .select("id, client_id, amount, status, method, received_date, due_date, notes")
          .or(
            `and(status.in.(received,client_confirmed),received_date.gte.${monthStart},received_date.lte.${monthEnd}),status.in.(pending,overdue)`
          )
          .order("received_date", { ascending: false }),

        // All active clients for this trainer
        supabase
          .from("clients")
          .select("id, first_name, last_name")
          .eq("status", "active"),
      ])

      const bookings = bookingsResult.data ?? []
      const payments = paymentsResult.data ?? []
      const clients = clientsResult.data ?? []

      // Build client name map
      const clientMap = new Map<string, string>()
      for (const c of clients) {
        clientMap.set(c.id, `${c.first_name} ${c.last_name}`.trim())
      }

      // Count completed sessions per client this month
      const sessionCounts = new Map<string, number>()
      for (const b of bookings) {
        sessionCounts.set(b.client_id, (sessionCounts.get(b.client_id) ?? 0) + 1)
      }

      // Group payments per client
      const paymentsByClient = new Map<string, StatementPayment[]>()
      for (const p of payments) {
        const existing = paymentsByClient.get(p.client_id) ?? []
        existing.push({
          id: p.id,
          amount: p.amount,
          status: p.status as StatementPayment["status"],
          method: p.method,
          received_date: p.received_date,
          due_date: p.due_date,
          notes: p.notes,
        })
        paymentsByClient.set(p.client_id, existing)
      }

      // Collect all client IDs that appear in either sessions or payments
      const allClientIds = new Set([...sessionCounts.keys(), ...paymentsByClient.keys()])

      const result: StatementClient[] = []

      for (const clientId of allClientIds) {
        const name = clientMap.get(clientId) ?? "Unknown"
        const clientPayments = paymentsByClient.get(clientId) ?? []
        const sessionsCompleted = sessionCounts.get(clientId) ?? 0

        const total_paid_confirmed = clientPayments
          .filter((p) => p.status === "received")
          .reduce((sum, p) => sum + p.amount, 0)

        const total_paid_unconfirmed = clientPayments
          .filter((p) => p.status === "client_confirmed")
          .reduce((sum, p) => sum + p.amount, 0)

        const total_due = clientPayments
          .filter((p) => p.status === "pending" || p.status === "overdue")
          .reduce((sum, p) => sum + p.amount, 0)

        result.push({
          client_id: clientId,
          client_name: name,
          sessions_completed: sessionsCompleted,
          package_name: null,
          package_total_sessions: null,
          payments: clientPayments,
          total_paid_confirmed,
          total_paid_unconfirmed,
          total_due,
        })
      }

      // Sort: clients with outstanding dues first, then by name
      return result.sort((a, b) => {
        if (b.total_due !== a.total_due) return b.total_due - a.total_due
        return a.client_name.localeCompare(b.client_name)
      })
    },
  })
}

