"use client"

import { useState, useEffect } from "react"
import { useBookings } from "@/hooks/useBookings"
import { useWeekBookings, getWeekStart } from "@/hooks/useWeekBookings"
import { useClients } from "@/hooks/useClients"
import { useBlockedDays, useBlockDay, useUnblockDay } from "@/hooks/useAvailability"
import { WeekStrip } from "@/components/calendar/WeekStrip"
import { DayTimeline } from "@/components/calendar/DayTimeline"
import { BookingActionSheet } from "@/components/clients/BookingActionSheet"
import { CreateBookingSheet } from "@/components/clients/CreateBookingSheet"
import { Button } from "@/components/ui/button"
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
import { useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronLeft, ChevronRight, Copy, Loader2, Ban } from "lucide-react"
import { format, addDays, parseISO } from "date-fns"
import type { Booking } from "@/types/database"

function getSGTToday(): string {
  const now = new Date()
  const sgtOffset = 8 * 60
  const sgt = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
  return format(sgt, "yyyy-MM-dd")
}

export default function BookingsPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState("")
  const [actionBooking, setActionBooking] = useState<Booking | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [prefilledTime, setPrefilledTime] = useState<string | undefined>()
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [copyPending, setCopyPending] = useState(false)
  const [cancelDayOpen, setCancelDayOpen] = useState(false)
  const [cancelDayPending, setCancelDayPending] = useState(false)
  const [blockDayOpen, setBlockDayOpen] = useState(false)
  const queryClient = useQueryClient()
  const { data: blockedDays } = useBlockedDays()
  const blockDay = useBlockDay()
  const unblockDay = useUnblockDay()

  useEffect(() => {
    setSelectedDate(getSGTToday())
  }, [])

  const weekStart = getWeekStart(weekOffset)
  const { data: weekBookings, isLoading: weekLoading } = useWeekBookings(weekStart)
  const { data: dayBookings, isLoading: dayLoading } = useBookings(selectedDate)
  const { data: clients } = useClients()

  const weekLabel = `${format(parseISO(weekStart), "d MMM")} – ${format(addDays(parseISO(weekStart), 6), "d MMM")}`

  function getClientName(clientId: string): string {
    const c = clients?.find((cl) => cl.id === clientId)
    return c ? `${c.first_name} ${c.last_name}` : "Unknown"
  }

  function handleThisWeek() {
    setWeekOffset(0)
    setSelectedDate(getSGTToday())
  }

  const isBlocked = blockedDays?.includes(selectedDate)

  async function handleCancelDay() {
    if (!dayBookings || dayBookings.length === 0) return
    const bookingIds = dayBookings
      .filter((b) => ["confirmed", "pending", "upcoming"].includes(b.status))
      .map((b) => b.id)
    if (bookingIds.length === 0) {
      toast.error("No active sessions to cancel")
      return
    }
    setCancelDayPending(true)
    try {
      const res = await fetch("/api/bookings/bulk-cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_ids: bookingIds, action: "cancel_day" }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.cancelled} session${data.cancelled !== 1 ? "s" : ""} cancelled & day blocked`)
        queryClient.invalidateQueries({ queryKey: ["bookings"] })
        queryClient.invalidateQueries({ queryKey: ["weekBookings"] })
        queryClient.invalidateQueries({ queryKey: ["blocked-days"] })
        queryClient.invalidateQueries({ queryKey: ["blocked-slots"] })
      } else {
        toast.error(data.error || "Failed to cancel sessions")
      }
    } catch {
      toast.error("Failed to cancel sessions")
    } finally {
      setCancelDayPending(false)
      setCancelDayOpen(false)
    }
  }

  function handleBlockDay() {
    blockDay.mutate(selectedDate, {
      onSuccess: () => {
        toast.success("Day blocked from new bookings")
        setBlockDayOpen(false)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to block day"),
    })
  }

  function handleUnblockDay() {
    unblockDay.mutate(selectedDate, {
      onSuccess: () => toast.success("Day unblocked"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to unblock day"),
    })
  }

  async function handleCopyWeek() {
    setCopyPending(true)
    try {
      const res = await fetch("/api/bookings/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_week_start: weekStart }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.created} session${data.created !== 1 ? "s" : ""} copied to next week${data.skipped > 0 ? ` (${data.skipped} skipped)` : ""}`)
        queryClient.invalidateQueries({ queryKey: ["bookings"] })
        queryClient.invalidateQueries({ queryKey: ["weekBookings"] })
      } else {
        toast.error(data.error || "Failed to copy week")
      }
    } catch {
      toast.error("Failed to copy week")
    } finally {
      setCopyPending(false)
      setCopyConfirmOpen(false)
    }
  }

  const activeBookingCount = dayBookings?.filter((b) => ["confirmed", "pending", "upcoming"].includes(b.status)).length ?? 0

  return (
    <div className="flex flex-col h-full">

      {/* TOP SECTION — fixed header + week strip */}
      <div className="shrink-0 space-y-3 pb-3">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{weekLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset((o) => o + 1)}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* This week + Copy week buttons */}
        <div className="flex gap-2">
          {weekOffset !== 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleThisWeek}
            >
              This week
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`${weekOffset !== 0 ? "flex-1" : "w-full"} text-xs`}
            onClick={() => setCopyConfirmOpen(true)}
          >
            <Copy className="mr-1 h-3 w-3" />
            Copy week →
          </Button>
        </div>

        {/* Week strip */}
        <WeekStrip
          weekStart={weekStart}
          bookings={weekBookings ?? []}
          blockedDays={blockedDays ?? []}
          selectedDate={selectedDate}
          onDayTap={setSelectedDate}
          isLoading={weekLoading}
        />
      </div>

      {/* BOTTOM SECTION — day header + timeline */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">

        {/* Day header */}
        <div className="shrink-0 flex items-center justify-between py-2">
          <h2 className="text-base font-semibold" style={{ color: "white" }}>
            {selectedDate
              ? format(parseISO(selectedDate), "EEEE, d MMMM")
              : "Loading..."}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "#00C6D4" }}
            className="text-xs"
            onClick={() => setCreateOpen(true)}
          >
            + Add session
          </Button>
        </div>

        {/* Cancel/Block day actions */}
        {selectedDate && (
          <div className="shrink-0 pb-2">
            {isBlocked ? (
              <div
                className="flex items-center justify-between rounded-xl p-3"
                style={{
                  background: "rgba(225,29,72,0.15)",
                  border: "1px solid rgba(225,29,72,0.4)",
                }}
              >
                <span className="flex items-center gap-1.5" style={{ color: "#e11d48", fontSize: "13px", fontWeight: 600 }}>
                  <Ban className="h-3.5 w-3.5" />
                  Day blocked
                </span>
                <button
                  onClick={handleUnblockDay}
                  style={{ color: "#e11d48", fontSize: "12px" }}
                  className="font-medium underline"
                >
                  Remove
                </button>
              </div>
            ) : activeBookingCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-rose-500 hover:text-rose-600"
                onClick={() => setCancelDayOpen(true)}
              >
                <Ban className="mr-1 h-3 w-3" />
                Cancel all & block day
              </Button>
            ) : !dayLoading ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-rose-500 hover:text-rose-600"
                onClick={() => setBlockDayOpen(true)}
              >
                <Ban className="mr-1 h-3 w-3" />
                Block day
              </Button>
            ) : null}
          </div>
        )}

        {/* Day Timeline */}
        <DayTimeline
          date={selectedDate}
          bookings={dayBookings ?? []}
          clients={clients ?? []}
          blockedDays={blockedDays ?? []}
          onBookingTap={(b) => setActionBooking(b)}
          onEmptySlotTap={(startTime) => {
            setPrefilledTime(startTime)
            setCreateOpen(true)
          }}
          isLoading={dayLoading}
        />
      </div>

      {/* FAB */}
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full fab-glow"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Action sheet */}
      {actionBooking && (
        <BookingActionSheet
          booking={actionBooking}
          clientName={getClientName(actionBooking.client_id)}
          open={!!actionBooking}
          onOpenChange={(o) => { if (!o) setActionBooking(null) }}
        />
      )}

      <CreateBookingSheet
        defaultDate={selectedDate}
        defaultTime={prefilledTime}
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o)
          if (!o) setPrefilledTime(undefined)
        }}
      />

      {/* Cancel day confirmation */}
      <AlertDialog open={cancelDayOpen} onOpenChange={setCancelDayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel all sessions on {selectedDate ? format(parseISO(selectedDate), "EEEE, d MMMM") : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {activeBookingCount} session{activeBookingCount !== 1 ? "s" : ""} and block the day from new bookings. Each client will receive a WhatsApp notification with your booking link to reschedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelDayPending}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelDay} disabled={cancelDayPending} className="bg-rose-600 hover:bg-rose-700">
              {cancelDayPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block empty day confirmation */}
      <AlertDialog open={blockDayOpen} onOpenChange={setBlockDayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {selectedDate ? format(parseISO(selectedDate), "EEEE, d MMMM") : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will prevent new bookings on this day. You can remove the block at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockDay} className="bg-rose-600 hover:bg-rose-700">
              Block day
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy week confirmation */}
      <AlertDialog open={copyConfirmOpen} onOpenChange={setCopyConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy week?</AlertDialogTitle>
            <AlertDialogDescription>
              Copy all sessions from {weekLabel} to the following week? This will duplicate all confirmed, pending, and upcoming bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={copyPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCopyWeek} disabled={copyPending}>
              {copyPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Copy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
