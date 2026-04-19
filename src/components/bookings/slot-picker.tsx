"use client"

import { useRef, useState, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, CalendarX, ChevronDown } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { EmptyState } from "@/components/ui/empty-state"
import { buildSlots } from "@/components/BookingForm"

interface AvailabilityData {
  busySlots: string[]
  availableSlots: string[]
}

type Period = "morning" | "afternoon" | "evening"

export interface SlotPickerProps {
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
      <EmptyState
        icon={Calendar}
        title="Pick a date"
        body="Choose a day above to see available times."
        headingLevel="h3"
      />
    )
  }

  if (availabilityLoading) {
    // Skeleton rows foreshadow the final accordion shape so there's no
    // layout jump when availability resolves. Each row mirrors the padded
    // row with a label/range stack on the left and a "N free" pill on the
    // right — the chevron is omitted because it's an interaction affordance
    // and its absence during load is honest.
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5"
          >
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!availabilityData) return null

  if (availabilityData.availableSlots.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="No slots on this date"
        body="Try another day — most trainers add slots a few days ahead."
        headingLevel="h3"
      />
    )
  }

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
                <div className="text-body-sm font-semibold">{p.label}</div>
                <div className="text-micro text-muted-foreground">{p.range}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-micro font-semibold ${
                    freeCount === 0
                      ? "bg-muted text-muted-foreground"
                      : "bg-[rgba(0,224,150,0.15)] text-[#00E096]"
                  }`}
                >
                  {freeCount} free
                </span>
                <Icon
                  name={ChevronDown}
                  size="sm"
                  className="text-muted-foreground transition-transform"
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
                        className="rounded-lg py-2 text-center text-xs font-semibold bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      >
                        <div>{time}</div>
                        <div className="text-micro">Booked</div>
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
                        className="rounded-lg py-2 text-center text-xs font-semibold bg-primary text-primary-foreground border border-primary transition-transform duration-75 active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none"
                      >
                        <div>{time}</div>
                        <div className="text-micro opacity-80">Selected</div>
                      </button>
                    )
                  }

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onSelectTime(slot)}
                      aria-label={`Select ${formatTime(slot)}`}
                      className="rounded-lg py-2 text-center text-xs font-semibold border border-input bg-background hover:border-primary transition-transform duration-75 active:scale-95 motion-reduce:active:scale-100 motion-reduce:transition-none"
                    >
                      <div>{time}</div>
                      <div className="text-micro text-muted-foreground">{period}</div>
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
