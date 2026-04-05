import { createServiceClient } from "@/lib/supabase/service"
import { format } from "date-fns"
import { SessionActions } from "./session-actions"
import { WhatsAppLink } from "./whatsapp-link"
import { Progress } from "@/components/ui/progress"

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
      id, trainer_id, date_time, duration_mins, session_type, status, location, payment_mode, payment_status, payment_amount, package_id,
      clients(first_name, last_name),
      profiles:trainer_id(name, whatsapp_number, paynow_details, paynow_number, bank_name, bank_account_number, bank_account_name, payment_link, cancellation_policy_hours)
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

  // Fetch package details if linked — scoped to same trainer for defence-in-depth
  const packageData: {
    name: string; total_sessions: number; sessions_used: number;
    expiry_date: string | null; status: string
  } | null = booking.package_id
    ? await supabase
        .from("packages")
        .select("name, total_sessions, sessions_used, expiry_date, status, trainer_id")
        .eq("id", booking.package_id)
        .single()
        .then((r) => {
          if (!r.data) return null
          // Verify package belongs to the same trainer as the booking
          if (r.data.trainer_id !== booking.trainer_id) return null
          return r.data
        })
    : null

  const client = booking.clients as unknown as { first_name: string; last_name: string }
  const trainer = booking.profiles as unknown as {
    name: string
    whatsapp_number: string | null
    paynow_details: string | null
    paynow_number: string | null
    bank_name: string | null
    bank_account_number: string | null
    bank_account_name: string | null
    payment_link: string | null
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

        {/* Package status */}
        {packageData && packageData.status === "active" && (() => {
          const remaining = packageData.total_sessions - packageData.sessions_used
          const progressPct = (packageData.sessions_used / packageData.total_sessions) * 100
          const expiryDate = packageData.expiry_date ? new Date(packageData.expiry_date) : null
          const expiryDays = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null

          return (
            <div className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                  <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span className="text-sm font-semibold">{packageData.name}</span>
              </div>
              <p className="text-sm">
                {packageData.sessions_used} of {packageData.total_sessions} sessions used —{" "}
                <span className={remaining <= 1 ? "text-red-500 font-semibold" : remaining === 2 ? "text-amber-500 font-semibold" : "text-green-600 font-semibold"}>
                  {remaining} remaining
                </span>
              </p>
              <Progress value={progressPct} className="h-1.5" />
              {expiryDate && (
                <p className={`text-xs ${expiryDays !== null && expiryDays <= 7 ? "text-red-500" : "text-muted-foreground"}`}>
                  Package expires {format(expiryDate, "d MMM yyyy")}
                </p>
              )}
              {remaining === 0 && (
                <p className="text-xs text-amber-600">
                  Your package is complete — speak to your trainer to renew
                </p>
              )}
            </div>
          )
        })()}

        {/* Payment details */}
        {(booking.payment_status === "unpaid" || pendingPayment) && (
          <div className="rounded-xl border border-[rgba(255,179,71,0.3)] bg-[rgba(255,179,71,0.1)] p-4 space-y-2">
            <p className="text-sm font-semibold text-[#FFB347]">
              {booking.payment_amount
                ? `Payment outstanding — $${booking.payment_amount}`
                : "Payment outstanding"}
            </p>
            {(trainer.paynow_number || trainer.paynow_details) && (
              <div className="rounded-lg bg-[#1A3349] p-3 text-sm">
                <p className="text-xs text-muted-foreground">PayNow</p>
                <p className="font-mono font-medium">{trainer.paynow_number || trainer.paynow_details}</p>
              </div>
            )}
            {trainer.bank_name && trainer.bank_account_number && (
              <div className="rounded-lg bg-[#1A3349] p-3 text-sm">
                <p className="text-xs text-muted-foreground">Bank transfer</p>
                <p className="font-medium">{trainer.bank_name}</p>
                <p className="font-mono">{trainer.bank_account_number}</p>
                {trainer.bank_account_name && (
                  <p className="text-xs text-muted-foreground">{trainer.bank_account_name}</p>
                )}
              </div>
            )}
            {trainer.payment_link && trainer.payment_link.startsWith("https://") && (
              <a
                href={trainer.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-[#1A3349] p-3 text-sm text-primary hover:underline"
              >
                Pay online →
              </a>
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
          showPaymentButton={booking.payment_status === "unpaid"}
        />

        {/* Footer */}
        <p className="text-muted-foreground text-center text-xs pt-4">
          Powered by FitDesk
        </p>
      </div>
    </div>
  )
}
