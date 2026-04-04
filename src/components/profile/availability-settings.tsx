"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  useWorkingHours,
  useBlockedSlots,
  useSaveWorkingHours,
  useAddBlockedSlot,
  useDeleteBlockedSlot,
} from "@/hooks/useAvailability"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue
    TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
  }
}

function formatTimeLabel(t: string): string {
  const [hStr, mStr] = t.split(":")
  const h = parseInt(hStr, 10)
  const ampm = h >= 12 ? "PM" : "AM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${mStr} ${ampm}`
}

interface DayRow {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DEFAULTS: DayRow[] = [
  { day_of_week: 0, start_time: "08:00", end_time: "14:00", is_active: false },
  { day_of_week: 1, start_time: "08:00", end_time: "20:00", is_active: true },
  { day_of_week: 2, start_time: "08:00", end_time: "20:00", is_active: true },
  { day_of_week: 3, start_time: "08:00", end_time: "20:00", is_active: true },
  { day_of_week: 4, start_time: "08:00", end_time: "20:00", is_active: true },
  { day_of_week: 5, start_time: "08:00", end_time: "20:00", is_active: true },
  { day_of_week: 6, start_time: "08:00", end_time: "14:00", is_active: true },
]

export function AvailabilitySettings() {
  const { data: savedHours, isLoading: hoursLoading } = useWorkingHours()
  const { data: blockedSlots, isLoading: slotsLoading } = useBlockedSlots()
  const saveHours = useSaveWorkingHours()
  const addSlot = useAddBlockedSlot()
  const deleteSlot = useDeleteBlockedSlot()

  const [hours, setHours] = useState<DayRow[]>(DEFAULTS)
  const [blockDate, setBlockDate] = useState("")
  const [blockRange, setBlockRange] = useState("full_day")
  const [blockReason, setBlockReason] = useState("")
  const [conflictBookings, setConflictBookings] = useState<Array<{ id: string; client_name: string; date_time: string }>>([])
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [cancelPending, setCancelPending] = useState(false)

  const todayStr = new Date().toISOString().split("T")[0]

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      const merged = DEFAULTS.map((def) => {
        const saved = savedHours.find((s) => s.day_of_week === def.day_of_week)
        return saved
          ? { day_of_week: saved.day_of_week, start_time: saved.start_time, end_time: saved.end_time, is_active: saved.is_active }
          : def
      })
      setHours(merged)
    }
  }, [savedHours])

  function updateDay(dayIdx: number, field: keyof DayRow, value: string | boolean) {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIdx ? { ...h, [field]: value } : h))
    )
  }

  async function handleSaveHours() {
    saveHours.mutate(hours, {
      onSuccess: () => toast.success("Working hours saved"),
      onError: () => toast.error("Failed to save working hours"),
    })
  }

  async function handleBlockDate() {
    if (!blockDate) { toast.error("Select a date"); return }

    const slotData: { date: string; start_time?: string; end_time?: string; reason?: string } = {
      date: blockDate,
      reason: blockReason || undefined,
    }
    if (blockRange === "morning") {
      slotData.start_time = "06:00"
      slotData.end_time = "13:00"
    } else if (blockRange === "afternoon") {
      slotData.start_time = "13:00"
      slotData.end_time = "21:00"
    }

    // Save the blocked slot first, then check for conflicts
    const savedBlockDate = blockDate
    const savedBlockRange = blockRange

    addSlot.mutate(slotData, {
      onSuccess: async () => {
        toast.success("Date blocked")
        setBlockDate("")
        setBlockReason("")

        // Check for conflicting bookings after block is saved
        const supabase = createClient()
        let startRange = `${savedBlockDate}T00:00:00+08:00`
        let endRange = `${savedBlockDate}T23:59:59+08:00`

        if (savedBlockRange === "morning") {
          startRange = `${savedBlockDate}T06:00:00+08:00`
          endRange = `${savedBlockDate}T13:00:00+08:00`
        } else if (savedBlockRange === "afternoon") {
          startRange = `${savedBlockDate}T13:00:00+08:00`
          endRange = `${savedBlockDate}T21:00:00+08:00`
        }

        const { data: conflicts } = await supabase
          .from("bookings")
          .select("id, date_time, client_id, clients(first_name, last_name)")
          .gte("date_time", startRange)
          .lte("date_time", endRange)
          .in("status", ["confirmed", "pending", "upcoming"])

        if (conflicts && conflicts.length > 0) {
          const mapped = conflicts.map((b) => {
            const client = b.clients as unknown as { first_name: string; last_name: string } | null
            return {
              id: b.id,
              client_name: client ? `${client.first_name} ${client.last_name}` : "Unknown",
              date_time: b.date_time,
            }
          })
          setConflictBookings(mapped)
          setShowConflictDialog(true)
        }
      },
      onError: () => toast.error("Failed to block date"),
    })
  }

  async function handleBulkCancel() {
    setCancelPending(true)
    try {
      const res = await fetch("/api/bookings/bulk-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_ids: conflictBookings.map((b) => b.id),
          action: "restore",
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.cancelled} session${data.cancelled !== 1 ? "s" : ""} cancelled`)
      } else {
        toast.error(data.error || "Failed to cancel sessions")
      }
    } catch {
      toast.error("Failed to cancel sessions")
    } finally {
      setCancelPending(false)
      setShowConflictDialog(false)
      setConflictBookings([])
    }
  }

  // Reorder days: Mon-Sun for display
  const displayOrder = [1, 2, 3, 4, 5, 6, 0]

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Working hours</h3>
        {hoursLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {displayOrder.map((dayIdx) => {
              const row = hours.find((h) => h.day_of_week === dayIdx)!
              return (
                <div key={dayIdx} className={`flex items-center gap-2 ${!row.is_active ? "opacity-50" : ""}`}>
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => updateDay(dayIdx, "is_active", v)}
                  />
                  <span className="text-sm font-medium w-10 shrink-0">
                    {DAY_NAMES[dayIdx].slice(0, 3)}
                  </span>
                  <Select
                    value={row.start_time}
                    onValueChange={(v) => { if (v) updateDay(dayIdx, "start_time", v) }}
                    disabled={!row.is_active}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">to</span>
                  <Select
                    value={row.end_time}
                    onValueChange={(v) => { if (v) updateDay(dayIdx, "end_time", v) }}
                    disabled={!row.is_active}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{formatTimeLabel(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
            <Button onClick={handleSaveHours} disabled={saveHours.isPending} className="w-full">
              {saveHours.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save working hours
            </Button>
          </>
        )}
      </div>

      {/* Blocked Dates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Blocked dates</h3>
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="blockDate" className="text-xs">Date</Label>
              <Input
                id="blockDate"
                type="date"
                min={todayStr}
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Range</Label>
              <Select value={blockRange} onValueChange={(v) => { if (v) setBlockRange(v) }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_day">Full day</SelectItem>
                  <SelectItem value="morning">Morning (6AM–1PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (1PM–9PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input
            placeholder="Reason (optional)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={handleBlockDate}
            disabled={addSlot.isPending}
          >
            {addSlot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Block date
          </Button>
        </div>

        {/* Blocked slots list */}
        {slotsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        ) : blockedSlots && blockedSlots.length > 0 ? (
          <div className="space-y-2">
            {blockedSlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between rounded-lg border p-2">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(slot.date + "T00:00:00"), "d MMM yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {slot.start_time && slot.end_time
                      ? `${formatTimeLabel(slot.start_time)} – ${formatTimeLabel(slot.end_time)}`
                      : "Full day"}
                    {slot.reason && ` · ${slot.reason}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => deleteSlot.mutate(slot.id, {
                    onSuccess: () => toast.success("Block removed"),
                    onError: () => toast.error("Failed to remove"),
                  })}
                  disabled={deleteSlot.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs text-center py-2">No upcoming blocked dates</p>
        )}
      </div>

      {/* Conflict dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing bookings found</AlertDialogTitle>
            <AlertDialogDescription>
              You have {conflictBookings.length} session{conflictBookings.length !== 1 ? "s" : ""} booked during this blocked period. Cancel them all?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conflictBookings.map((b) => (
              <p key={b.id} className="text-sm">
                {b.client_name} — {format(new Date(b.date_time), "h:mm a")}
              </p>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelPending}>Keep sessions</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkCancel} disabled={cancelPending}>
              {cancelPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
