"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2, Check, ChevronDown } from "lucide-react"
import { format, parseISO, isBefore, startOfDay } from "date-fns"
import { z } from "zod"
import type { BookingSessionType } from "@/types/database"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"

interface BookingFormProps {
  trainerId: string
  trainerName: string
}

interface AvailabilityData {
  busySlots: string[]
  availableSlots: string[]
}

type Period = "morning" | "afternoon" | "evening"

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

const PERIODS: ReadonlyArray<{ name: Period; label: string; range: string; slots: readonly string[] }> = [
  {
    name: "morning",
    label: "Morning",
    range: "6:00 AM – 11:00 AM",
    slots: buildSlots(6, 11),
  },
  {
    name: "afternoon",
    label: "Afternoon",
    range: "12:00 PM – 5:00 PM",
    slots: buildSlots(12, 17),
  },
  {
    name: "evening",
    label: "Evening",
    range: "6:00 PM – 9:00 PM",
    slots: buildSlots(18, 21),
  },
] as const

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

function formatTimeShort(t: string): { time: string; period: string } {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return { time: `${h12}:${mStr}`, period: ampm }
}

export function BookingForm({ trainerId, trainerName }: BookingFormProps) {
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
  const [openPeriod, setOpenPeriod] = useState<Period | null>(null)
  const periodRefs = useRef<(HTMLButtonElement | null)[]>([])

  const todayStr = new Date().toISOString().split("T")[0]

  const busySet = useMemo(
    () => new Set(availabilityData?.busySlots ?? []),
    [availabilityData]
  )

  const availableSet = useMemo(
    () => new Set(availabilityData?.availableSlots ?? []),
    [availabilityData]
  )

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
    setOpenPeriod(null)

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

  function handlePeriodToggle(period: Period, index: number) {
    if (openPeriod === period) {
      setOpenPeriod(null)
      return
    }
    setOpenPeriod(period)
    setTimeout(() => {
      periodRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 50)
  }

  function getFreeCount(slots: readonly string[]): number {
    if (!availabilityData) return 0
    let count = 0
    for (const s of slots) {
      if (availableSet.has(s)) count++
    }
    return count
  }

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
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Booking request sent!</h2>
        <p className="text-muted-foreground text-sm">
          {trainerName} will confirm your session via WhatsApp shortly.
        </p>
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
      {!date && (
        <p className="text-muted-foreground text-sm text-center py-4">
          Select a date above to see available times
        </p>
      )}

      {date && availabilityLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      )}

      {date && !availabilityLoading && availabilityData && (
        <div className="space-y-2">
          {PERIODS.map((p, i) => {
            const freeCount = getFreeCount(p.slots)
            const isOpen = openPeriod === p.name
            const isDisabled = freeCount === 0
            const panelId = `period-panel-${p.name}`

            return (
              <div key={p.name}>
                <button
                  type="button"
                  ref={(el) => { periodRefs.current[i] = el }}
                  disabled={isDisabled}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => handlePeriodToggle(p.name, i)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isDisabled
                      ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                      : "border-input bg-background hover:border-primary"
                  }`}
                >
                  <div>
                    <div className="text-[13px] font-bold">{p.label}</div>
                    <div className="text-[11px] text-muted-foreground">{p.range}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        freeCount === 0
                          ? "bg-muted text-muted-foreground"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {freeCount} free
                    </span>
                    <ChevronDown
                      className="h-4 w-4 text-muted-foreground transition-transform"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div id={panelId} role="region" className="grid grid-cols-4 gap-1.5 pt-2 pb-1">
                    {p.slots.map((slot) => {
                      const isBusy = busySet.has(slot)
                      const isSelected = slot === selectedTime
                      const { time, period } = formatTimeShort(slot)

                      if (isBusy) {
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled
                            aria-label={`${formatTime(slot)} — booked`}
                            className="rounded-lg py-2 text-center text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                          >
                            <div>{time}</div>
                            <div className="text-[11px]">Booked</div>
                          </button>
                        )
                      }

                      if (isSelected) {
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            aria-label={`${formatTime(slot)} — selected`}
                            className="rounded-lg py-2 text-center text-xs font-medium bg-primary text-primary-foreground border border-primary"
                          >
                            <div>{time}</div>
                            <div className="text-[11px] opacity-80">Selected</div>
                          </button>
                        )
                      }

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          aria-label={`Select ${formatTime(slot)}`}
                          className="rounded-lg py-2 text-center text-xs font-medium border border-input bg-background hover:border-primary"
                        >
                          <div>{time}</div>
                          <div className="text-[11px] text-muted-foreground">{period}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedTime && date && (
        <div className="bg-green-50 text-green-800 rounded-lg px-3 py-2 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
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
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Request booking
      </Button>
    </form>
  )
}
