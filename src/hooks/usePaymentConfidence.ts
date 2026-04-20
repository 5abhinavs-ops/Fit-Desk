 "use client"
 
 import { useQuery } from "@tanstack/react-query"
 import { createClient } from "@/lib/supabase/client"
 import type { BookingPaymentMode, BookingPaymentStatus, PaymentStatus } from "@/types/database"
 
 export type PaymentConfidence = {
   confirmed: number
   clientConfirmed: number
   due: number
 }
 
 const CONFIDENCE_BOOKING_MODES: BookingPaymentMode[] = ["pay_later", "pay_now"]
 
 function toAmount(n: unknown): number {
   if (typeof n === "number" && Number.isFinite(n)) return n
   if (typeof n === "string") {
     const parsed = Number(n)
     return Number.isFinite(parsed) ? parsed : 0
   }
   return 0
 }
 
 export async function fetchPaymentConfidence(): Promise<PaymentConfidence> {
   const supabase = createClient()
 
   const [paymentsResult, bookingsResult] = await Promise.all([
     supabase
       .from("payments")
      .select("amount,status,booking_id")
       .in("status", ["received", "pending", "overdue"] satisfies PaymentStatus[])
       .order("created_at", { ascending: false })
       .limit(500),
 
     supabase
       .from("bookings")
      .select("id,payment_status,payment_amount,payment_mode")
       .in("payment_mode", CONFIDENCE_BOOKING_MODES)
       .limit(500),
   ])
 
   if (paymentsResult.error) throw paymentsResult.error
   if (bookingsResult.error) throw bookingsResult.error
 
   const payments = paymentsResult.data ?? []
  const bookings = bookingsResult.data ?? []

  const bookingIdsWithPayment = new Set(
    payments
      .map((p) => p.booking_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  )
 
   const fromPayments = payments.reduce(
     (acc, p) => {
       const amount = toAmount(p.amount)
       const status = p.status as PaymentStatus
       if (status === "received") acc.confirmed += amount
       else if (status === "pending" || status === "overdue") acc.due += amount
       return acc
     },
     { confirmed: 0, clientConfirmed: 0, due: 0 } as PaymentConfidence,
   )
 
   const fromBookings = bookings.reduce(
     (acc, b) => {
      if (bookingIdsWithPayment.has(b.id)) return acc

       const amount = toAmount(b.payment_amount)
       const status = b.payment_status as BookingPaymentStatus
 
       if (amount <= 0) return acc
 
       if (status === "paid") acc.confirmed += amount
       else if (status === "client_confirmed") acc.clientConfirmed += amount
       else if (status === "unpaid") acc.due += amount
 
       return acc
     },
     { confirmed: 0, clientConfirmed: 0, due: 0 } as PaymentConfidence,
   )
 
   return {
     confirmed: fromPayments.confirmed + fromBookings.confirmed,
     clientConfirmed: fromPayments.clientConfirmed + fromBookings.clientConfirmed,
     due: fromPayments.due + fromBookings.due,
   }
 }
 
 export function usePaymentConfidence() {
   return useQuery({
     queryKey: ["paymentConfidence"],
     queryFn: fetchPaymentConfidence,
   })
 }
