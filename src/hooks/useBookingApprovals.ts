"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

interface PendingApproval {
  id: string
  booking_id: string
  created_at: string
  booking: {
    id: string
    date_time: string
    session_type: string
    client_id: string
    clients: {
      first_name: string
      last_name: string
      whatsapp_number: string
    }
  }
}

export function usePendingApprovals() {
  const supabase = createClient()

  return useQuery({
    queryKey: ["booking-approvals", "pending"],
    queryFn: async (): Promise<PendingApproval[]> => {
      const { data, error } = await supabase
        .from("booking_approvals")
        .select(`
          id,
          booking_id,
          created_at,
          booking:bookings!booking_id(
            id,
            date_time,
            session_type,
            client_id,
            clients(first_name, last_name, whatsapp_number)
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Flatten the booking join
      return (data ?? []).map((row) => ({
        ...row,
        booking: row.booking as unknown as PendingApproval["booking"],
      }))
    },
  })
}
