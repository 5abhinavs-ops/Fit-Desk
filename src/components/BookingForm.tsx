"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Check } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { SlotPicker } from "@/components/bookings/slot-picker"
import { format, parseISO, isBefore, startOfDay } from "date-fns"
import { z } from "zod"
import type { BookingSessionType } from "@/types/database"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"

interface BookingFormProps {
  trainerId: string
  trainerName: string
  /** First-line location hint on confirmation (e.g. joined training locations). */
  locationSummary?: string | null
}

interface AvailabilityData {
  busySlots: string[]
  availableSlots: string[]
}

export function buildSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = []
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      if (h === endHour && m === 30) continue
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
    }
  }
  return slots
}

const availabilityResponseSchema = z.object({
  date: z.string(),
  busySlots: z.array(z.string()),
  availableSlots: z.array(z.string()),
})

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${ampm}`
}

export function BookingForm({
  trainerId,
  trainerName,
  locationSummary,
}: BookingFormProps) {
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [sessionType, setSessionType] = useState<BookingSessionType>("1-on-1")
  const [date, setDate] = useState("")
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])

  useEffect(() => {
    if (!date) {
      setAvailabilityData(null)
      setAvailabilityLoading(false)
      return
    }

    const selected = startOfDay(parseISO(date))
    if (isBefore(selected, startOfDay(new Date()))) {
      setAvailabilityData(null)
      setAvailabilityLoading(false)
      return
    }

    const controller = new AbortController()
    setAvailabilityLoading(true)
    setAvailabilityData(null)
    setSelectedTime(null)

    fetch(
      `/api/availability?trainer_id=${encodeURIComponent(trainerId)}&date=${encodeURIComponent(date)}`,
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed")
        return res.json()
      })
      .then((json: unknown) => {
        const data = availabilityResponseSchema.parse(json)
        setAvailabilityData({
          busySlots: data.busySlots,
          availableSlots: data.availableSlots,
        })
        setAvailabilityLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setAvailabilityLoading(false)
        toast.error("Could not load availability")
      })

    return () => controller.abort()
  }, [date, trainerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTime) return
    setLoading(true)

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainer_id: trainerId,
          client_name: name,
          client_whatsapp: whatsapp,
          preferred_date: date,
          preferred_time: selectedTime,
          session_type: sessionType,
          notes: notes || undefined,
        }),
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to submit booking")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-5 rounded-xl bg-[rgba(0,224,150,0.12)] px-4 py-8 text-center">
        <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(0,224,150,0.2)]">
          <div
            className="pc-checkmark-in flex items-center justify-center"
            style={{ transformOrigin: "center" }}
          >
            <Icon name={Check} size="lg" className="text-[#00E096]" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xl font-semibold">{trainerName}</p>
          <p className="text-body-sm text-foreground">
            Your session request has been sent to {trainerName}.
          </p>
          <p className="text-muted-foreground text-sm">
            You&apos;ll receive a WhatsApp confirmation shortly.
          </p>
          {locationSummary && locationSummary.trim().length > 0 ? (
            <p className="text-body-sm text-muted-foreground pt-1">
              <span aria-hidden>📍 </span>
              {locationSummary.trim()}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clientName">Your name</Label>
        <Input
          id="clientName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientWa">Your WhatsApp number</Label>
        <Input
          id="clientWa"
          type="tel"
          placeholder="+65 9123 4567"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          onBlur={(e) => setWhatsapp(formatWhatsappNumber(e.target.value))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label id="sessionTypeLabel">Session type</Label>
        <Select
          value={sessionType}
          onValueChange={(v) => setSessionType((v ?? "1-on-1") as BookingSessionType)}
          aria-labelledby="sessionTypeLabel"
        >
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

      <div className="space-y-2">
        <Label htmlFor="prefDate">Preferred date</Label>
        <Input
          id="prefDate"
          type="date"
          min={todayStr}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Time slot picker */}
      <SlotPicker
        date={date}
        availabilityData={availabilityData}
        availabilityLoading={availabilityLoading}
        selectedTime={selectedTime}
        onSelectTime={setSelectedTime}
      />

      {selectedTime && date && (
        <div className="bg-[rgba(0,224,150,0.15)] text-[#00E096] rounded-lg px-3 py-2 flex items-center gap-2">
          {/* 14px to match text-sm caption */}
          <Icon name={Check} size="sm" className="size-3.5 text-[#00E096] shrink-0" />
          <span className="text-sm">
            {format(parseISO(date), "EEEE d MMM")} &middot; {formatTime(selectedTime)} selected
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="clientNotes">Message / notes</Label>
        <Textarea
          id="clientNotes"
          placeholder="Any injuries or goals I should know about?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !selectedTime || !date || !name || !whatsapp}
      >
        {loading && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
        Request booking
      </Button>
    </form>
  )
}
