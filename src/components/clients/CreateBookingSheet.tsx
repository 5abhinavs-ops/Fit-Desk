"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useClients } from "@/hooks/useClients"
import { useCreateBooking } from "@/hooks/useBookings"
import { usePackages } from "@/hooks/usePackages"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { BookingPaymentMode } from "@/types/database"

interface CreateBookingSheetProps {
  defaultDate: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const timeSlots: string[] = []
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue
    const hh = h.toString().padStart(2, "0")
    const mm = m.toString().padStart(2, "0")
    timeSlots.push(`${hh}:${mm}`)
  }
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${ampm}`
}

export function CreateBookingSheet({ defaultDate, open, onOpenChange }: CreateBookingSheetProps) {
  const { data: clients } = useClients()
  const createBooking = useCreateBooking()
  const [clientId, setClientId] = useState("")
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState("09:00")
  const [duration, setDuration] = useState("60")
  const [sessionType, setSessionType] = useState("1-on-1")
  const [location, setLocation] = useState("")
  const [paymentMode, setPaymentMode] = useState<BookingPaymentMode>("pay_later")
  const [notes, setNotes] = useState("")
  const [defaultMode, setDefaultMode] = useState<BookingPaymentMode>("pay_later")

  const { data: clientPackages } = usePackages(clientId || undefined)
  const activePackage = clientPackages?.find((p) => p.status === "active")

  useEffect(() => {
    setDate(defaultDate)
  }, [defaultDate])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("default_booking_payment_mode")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const mode = data.default_booking_payment_mode as BookingPaymentMode
              setDefaultMode(mode)
              setPaymentMode(mode)
            }
          })
      }
    })
  }, [])

  const activePackageHasRemaining = activePackage
    ? activePackage.total_sessions - activePackage.sessions_used > 0
    : false

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      toast.error("Please select a client")
      return
    }
    if (paymentMode === "from_package" && (!activePackage || !activePackageHasRemaining)) {
      toast.error("No active package with remaining sessions")
      return
    }

    const dateTime = new Date(`${date}T${time}:00`).toISOString()

    createBooking.mutate(
      {
        client_id: clientId,
        package_id: paymentMode === "from_package" && activePackage ? activePackage.id : null,
        date_time: dateTime,
        duration_mins: parseInt(duration, 10),
        session_type: sessionType as "1-on-1" | "group" | "assessment",
        status: "confirmed",
        location: location || null,
        payment_mode: paymentMode,
        stripe_payment_intent_id: null,
        booking_source: "trainer",
        client_intake_notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Session booked")
          setClientId("")
          setTime("09:00")
          setDuration("60")
          setSessionType("1-on-1")
          setLocation("")
          setPaymentMode(defaultMode)
          setNotes("")
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to book session")
        },
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Book session</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bkDate">Date</Label>
              <Input
                id="bkDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={time} onValueChange={(v) => setTime(v ?? "09:00")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTime(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v ?? "60")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session type</Label>
              <Select value={sessionType} onValueChange={(v) => setSessionType(v ?? "1-on-1")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-on-1">1-on-1</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="ActiveSG Jurong, Client's condo gym..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment mode</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode((v ?? "pay_later") as BookingPaymentMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pay_later">Pay later</SelectItem>
                <SelectItem value="pay_now">Pay now (Stripe)</SelectItem>
                <SelectItem value="from_package" disabled={!activePackageHasRemaining}>From package</SelectItem>
              </SelectContent>
            </Select>
            {paymentMode === "from_package" && activePackage && (
              <p className="text-muted-foreground text-xs">
                {activePackage.name}: {activePackage.total_sessions - activePackage.sessions_used} sessions remaining
              </p>
            )}
            {paymentMode === "from_package" && !activePackage && clientId && (
              <p className="text-xs text-red-500">No active package for this client</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for client</Label>
            <Textarea
              id="notes"
              placeholder="Anything the client should know..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createBooking.isPending}>
            {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Book session
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
