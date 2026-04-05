"use client"

import { useState, useMemo } from "react"
import {
  useOpenSlots,
  useDateOverrides,
  useAddDateOverride,
  useDeleteDateOverride,
} from "@/hooks/useAvailability"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Trash2, Plus, Loader2 } from "lucide-react"
import Link from "next/link"

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

interface MergedSlot {
  startTime: string
  durationMins: number
  source: "weekly" | "override"
  overrideId?: string
  weeklySlotId?: string
}

interface SlotManagerProps {
  date: string
}

export function SlotManager({ date }: SlotManagerProps) {
  const { data: openSlots, isLoading: slotsLoading } = useOpenSlots()
  const { data: overrides, isLoading: overridesLoading } = useDateOverrides(date)
  const addOverride = useAddDateOverride()
  const deleteOverride = useDeleteDateOverride()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTime, setNewTime] = useState("09:00")
  const [newDuration, setNewDuration] = useState(60)

  const dayOfWeek = useMemo(() => {
    const d = new Date(`${date}T00:00:00.000Z`)
    return d.getUTCDay()
  }, [date])

  const mergedSlots = useMemo((): MergedSlot[] => {
    if (!openSlots) return []
    const removedTimes = new Set(
      (overrides ?? []).filter((o) => o.is_removed).map((o) => o.start_time),
    )
    const addedOverrides = (overrides ?? []).filter((o) => !o.is_removed)

    // Weekly defaults for this day, excluding removed ones
    const weekly: MergedSlot[] = openSlots
      .filter((s) => s.day_of_week === dayOfWeek && !removedTimes.has(s.start_time))
      .map((s) => ({
        startTime: s.start_time,
        durationMins: s.duration_mins,
        source: "weekly" as const,
        weeklySlotId: s.id,
      }))

    // Date-specific additions
    const added: MergedSlot[] = addedOverrides
      .filter((o) => !weekly.some((w) => w.startTime === o.start_time))
      .map((o) => ({
        startTime: o.start_time,
        durationMins: o.duration_mins ?? 60,
        source: "override" as const,
        overrideId: o.id,
      }))

    return [...weekly, ...added].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [openSlots, overrides, dayOfWeek])

  const isLoading = slotsLoading || overridesLoading

  function handleRemoveSlot(slot: MergedSlot) {
    if (slot.source === "override" && slot.overrideId) {
      deleteOverride.mutate(
        { id: slot.overrideId, date },
        {
          onSuccess: () => toast.success("Slot removed"),
          onError: () => toast.error("Failed to remove slot"),
        },
      )
    } else {
      // Weekly slot — add a removal override for this date
      addOverride.mutate(
        { date, start_time: slot.startTime, is_removed: true },
        {
          onSuccess: () => toast.success("Slot removed for this date"),
          onError: () => toast.error("Failed to remove slot"),
        },
      )
    }
  }

  function handleAddSlot() {
    addOverride.mutate(
      { date, start_time: newTime, duration_mins: newDuration, is_removed: false },
      {
        onSuccess: () => {
          toast.success("Slot added")
          setShowAddForm(false)
        },
        onError: () => toast.error("Failed to add slot"),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h3 className="text-sm font-semibold">Available slots for booking</h3>

      {mergedSlots.length === 0 ? (
        <p className="text-muted-foreground text-xs py-2 text-center">
          No slots configured for this day
        </p>
      ) : (
        <div className="space-y-1.5">
          {mergedSlots.map((slot) => (
            <div
              key={`${slot.startTime}-${slot.source}`}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatTimeLabel(slot.startTime)}
                </span>
                <span className="text-muted-foreground rounded bg-muted px-1.5 py-0.5 text-xs">
                  {slot.durationMins} min
                </span>
                {slot.source === "override" && (
                  <span className="text-xs text-cyan-500">+override</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-rose-500"
                onClick={() => handleRemoveSlot(slot)}
                disabled={addOverride.isPending || deleteOverride.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="flex items-center gap-2">
          <Select value={newTime} onValueChange={(v) => { if (v) setNewTime(v) }}>
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
            value={String(newDuration)}
            onValueChange={(v) => { if (v) setNewDuration(Number(v)) }}
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
            onClick={handleAddSlot}
            disabled={addOverride.isPending}
          >
            {addOverride.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add slot
        </Button>
      )}

      <Link
        href="/profile"
        className="text-muted-foreground block text-center text-xs underline"
      >
        Edit weekly defaults &rarr;
      </Link>
    </div>
  )
}
