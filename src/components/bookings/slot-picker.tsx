"use client"

import { useRef, useState, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown } from "lucide-react"
import { buildSlots } from "@/components/BookingForm"

interface AvailabilityData {
  busySlots: string[]
  availableSlots: string[]
}

type Period = "morning" | "afternoon" | "evening"

interface SlotPickerProps {
  date: string
  availabilityData: AvailabilityData | null
  availabilityLoading: boolean
  selectedTime: string | null
  onSelectTime: (time: string) => void
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

export function SlotPicker({ date, availabilityData, availabilityLoading, selectedTime, onSelectTime }: SlotPickerProps) {
  const [openPeriod, setOpenPeriod] = useState<Period | null>(null)
  const periodRefs = useRef<(HTMLButtonElement | null)[]>([])

  const busySet = useMemo(
    () => new Set(availabilityData?.busySlots ?? []),
    [availabilityData]
  )

  const availableSet = useMemo(
    () => new Set(availabilityData?.availableSlots ?? []),
    [availabilityData]
  )

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

  if (!date) {
    return (
      <p className="text-muted-foreground text-sm text-center py-4">
        Select a date above to see available times
      </p>
    )
  }

  if (availabilityLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    )
  }

  if (!availabilityData) return null

  return (
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
                      : "bg-[rgba(0,224,150,0.15)] text-[#00E096]"
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
                        onClick={() => onSelectTime(slot)}
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
                      onClick={() => onSelectTime(slot)}
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
  )
}
