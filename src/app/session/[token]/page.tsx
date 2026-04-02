import { createServiceClient } from "@/lib/supabase/service"
import { format } from "date-fns"
import { SessionActions } from "./session-actions"
import { WhatsAppLink } from "./whatsapp-link"

interface SessionPageProps {
  params: Promise<{ token: string }>
}

export default async function SessionManagementPage({ params }: SessionPageProps) {
  const { token } = await params
  const supabase = createServiceClient()

  // Validate token
  const { data: tokenRow, error: tokenError } = await supabase
    .from("session_tokens")
    .select("id, booking_id, expires_at, used_at")
    .eq("token", token)
    .single()

  if (tokenError || !tokenRow) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Link not found</h1>
          <p className="text-muted-foreground text-sm">
            This session management link is invalid.
          </p>
        </div>
      </div>
    )
  }

  const isExpired = new Date(tokenRow.expires_at) < new Date()
  const isUsed = !!tokenRow.used_at

  if (isExpired || isUsed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">This link has expired</h1>
          <p className="text-muted-foreground text-sm">
            {isUsed
              ? "This link has already been used."
              : "This session management link is no longer active."}
          </p>
        </div>
      </div>
    )
  }

  // Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id, date_time, duration_mins, session_type, status, location, payment_mode,
      clients(first_name, last_name),
      profiles:trainer_id(name, whatsapp_number, paynow_details, cancellation_policy_hours)
    `)
    .eq("id", tokenRow.booking_id)
    .single()

  if (bookingError || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">Booking not found</h1>
          <p className="text-muted-foreground text-sm">
            The booking associated with this link could not be found.
          </p>
        </div>
      </div>
    )
  }

  const client = booking.clients as unknown as { first_name: string; last_name: string }
  const trainer = booking.profiles as unknown as {
    name: string
    whatsapp_number: string | null
    paynow_details: string | null
    cancellation_policy_hours: number
  }
  const dt = new Date(booking.date_time)

  // Check for outstanding payment
  const { data: pendingPayment } = await supabase
    .from("payments")
    .select("id, amount, method, status, due_date")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .limit(1)
    .single()

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">Your session</h1>
          <p className="text-muted-foreground text-sm">with {trainer.name}</p>
        </div>

        {/* Session details card */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {format(dt, "EEEE, d MMMM yyyy")}
            </p>
            <p className="text-muted-foreground">
              {format(dt, "h:mm a")} · {booking.duration_mins} min · {booking.session_type}
            </p>
            {booking.location && (
              <p className="text-muted-foreground text-sm">{booking.location}</p>
            )}
          </div>

          <p className="text-sm">
            Hi {client.first_name}, manage your upcoming session below.
          </p>
        </div>

        {/* Outstanding payment */}
        {pendingPayment && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">Payment outstanding</p>
            <p className="text-sm text-amber-700">
              ${pendingPayment.amount} — {pendingPayment.method}
            </p>
            {trainer.paynow_details && (
              <div className="rounded-lg bg-white p-3 text-sm">
                <p className="text-xs text-muted-foreground">PayNow details</p>
                <p className="font-mono font-medium">{trainer.paynow_details}</p>
              </div>
            )}
          </div>
        )}

        {/* WhatsApp deep link */}
        {trainer.whatsapp_number && (
          <WhatsAppLink
            trainerName={trainer.name}
            trainerPhone={trainer.whatsapp_number}
            sessionDate={format(dt, "EEEE, d MMMM")}
            sessionTime={format(dt, "h:mm a")}
          />
        )}

        {/* Action buttons */}
        <SessionActions
          bookingId={booking.id}
          token={token}
          cancellationPolicyHours={trainer.cancellation_policy_hours}
          sessionDateTime={booking.date_time}
        />

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs pt-4">
          Powered by FitDesk
        </p>
      </div>
    </div>
  )
}
