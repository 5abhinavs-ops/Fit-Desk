"use client"

import { useState } from "react"
import {
  useOpenSlots,
  useSaveOpenSlot,
  useDeleteOpenSlot,
} from "@/hooks/useAvailability"
import type { PTOpenSlot } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Trash2, Plus, Loader2, X } from "lucide-react"
import { Icon } from "@/components/ui/icon"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon–Sun

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
  }
}

const DURATION_OPTIONS = [30, 60, 90, 120]

function formatTimeLabel(t: string): string {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${ampm}`
}

interface AddingState {
  dayOfWeek: number
  startTime: string
  durationMins: number
}

export function AvailabilitySettings() {
  const { data: openSlots, isLoading } = useOpenSlots()
  const saveSlot = useSaveOpenSlot()
  const deleteSlot = useDeleteOpenSlot()

  const [adding, setAdding] = useState<AddingState | null>(null)

  function handleAddSlot(dayOfWeek: number) {
    setAdding({ dayOfWeek, startTime: "09:00", durationMins: 60 })
  }

  function handleSaveNewSlot() {
    if (!adding) return
    saveSlot.mutate(
      {
        day_of_week: adding.dayOfWeek,
        start_time: adding.startTime,
        duration_mins: adding.durationMins,
      },
      {
        onSuccess: () => {
          toast.success("Slot added")
          setAdding(null)
        },
        onError: () => toast.error("Failed to add slot"),
      },
    )
  }

  function handleDeleteSlot(id: string) {
    deleteSlot.mutate(id, {
      onSuccess: () => toast.success("Slot removed"),
      onError: () => toast.error("Failed to remove slot"),
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Weekly default slots</h3>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    )
  }

  const slotsByDay = new Map<number, PTOpenSlot[]>()
  for (const slot of openSlots ?? []) {
    const existing = slotsByDay.get(slot.day_of_week) ?? []
    slotsByDay.set(slot.day_of_week, [...existing, slot])
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Weekly default slots</h3>
      <p className="text-muted-foreground text-xs">
        Set your weekly open time slots. Clients can book during these times. Override individual dates from the Calendar.
      </p>

      {DISPLAY_ORDER.map((dayIdx) => {
        const daySlots = slotsByDay.get(dayIdx) ?? []
        const isAdding = adding?.dayOfWeek === dayIdx

        return (
          <div key={dayIdx} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{DAY_NAMES[dayIdx]}</span>
              <span className="text-muted-foreground text-xs">
                {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
              </span>
            </div>

            {daySlots.length > 0 && (
              <div className="space-y-1">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{formatTimeLabel(slot.start_time)}</span>
                      <span className="text-muted-foreground text-xs">
                        {slot.duration_mins} min
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-rose-500"
                      onClick={() => handleDeleteSlot(slot.id)}
                      disabled={deleteSlot.isPending}
                    >
                      {/* 12px inside 24px icon-sm button */}
                      <Icon name={Trash2} size="sm" className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isAdding ? (
              <div className="flex items-center gap-2">
                <Select
                  value={adding.startTime}
                  onValueChange={(v) => { if (v) setAdding({ ...adding, startTime: v }) }}
                >
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTimeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(adding.durationMins)}
                  onValueChange={(v) => {
                    if (v) setAdding({ ...adding, durationMins: Number(v) })
                  }}
                >
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleSaveNewSlot}
                  disabled={saveSlot.isPending}
                >
                  {/* 12px inside size="sm" button */}
                  {saveSlot.isPending ? (
                    <Icon name={Loader2} size="sm" className="size-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setAdding(null)}
                >
                  {/* 12px cancel affordance inside size="sm" ghost button */}
                  <Icon name={X} size="sm" className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleAddSlot(dayIdx)}
              >
                {/* 12px inside size="sm" button */}
                <Icon name={Plus} size="sm" className="size-3 mr-1" />
                Add slot for {DAY_NAMES[dayIdx]}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
