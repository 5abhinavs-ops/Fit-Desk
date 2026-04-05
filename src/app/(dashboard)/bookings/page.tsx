"use client"

import { useState, useEffect } from "react"
import { useBookings } from "@/hooks/useBookings"
import { useWeekBookings, getWeekStart } from "@/hooks/useWeekBookings"
import { useClients } from "@/hooks/useClients"
import { useBlockedDays, useBlockDay, useUnblockDay } from "@/hooks/useAvailability"
import { WeekHeatmap } from "@/components/calendar/WeekHeatmap"
import { SlotManager } from "@/components/calendar/SlotManager"
import { BookingActionSheet } from "@/components/clients/BookingActionSheet"
import { CreateBookingSheet } from "@/components/clients/CreateBookingSheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronLeft, ChevronRight, Copy, Loader2, Ban } from "lucide-react"
import { format, addDays, parseISO } from "date-fns"
import type { Booking } from "@/types/database"

const statusDot: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  cancelled: "bg-[#64748B]",
  completed: "bg-green-500",
  "no-show": "bg-red-500",
  no_show: "bg-red-500",
  upcoming: "bg-green-500",
  forfeited: "bg-[#64748B]",
  pending_approval: "bg-amber-500",
  reschedule_requested: "bg-amber-500",
}

const sessionTypeBadge: Record<string, string> = {
  "1-on-1": "1-on-1",
  group: "Group",
  assessment: "Assessment",
}

function getSGTToday(): string {
  const now = new Date()
  const sgtOffset = 8 * 60
  const sgt = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
  return format(sgt, "yyyy-MM-dd")
}

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<"week" | "day">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState("")
  const [actionBooking, setActionBooking] = useState<Booking | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
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

  function handleDayTap(date: string) {
    setSelectedDate(date)
    setViewMode("day")
  }

  function handleBackToWeek() {
    setViewMode("week")
  }

  function handleThisWeek() {
    setWeekOffset(0)
    setSelectedDate(getSGTToday())
    setViewMode("week")
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
      onSuccess: () => toast.success("Day blocked from new bookings"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to block day"),
    })
    setBlockDayOpen(false)
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

  return (
    <div className="space-y-4">
      {/* Page header with week navigation */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setWeekOffset((o) => o - 1); setViewMode("week") }}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{weekLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setWeekOffset((o) => o + 1); setViewMode("week") }}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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

      {/* Week heatmap — always visible */}
      <WeekHeatmap
        weekStart={weekStart}
        bookings={weekBookings ?? []}
        isLoading={weekLoading}
        selectedDate={selectedDate}
        onDayTap={handleDayTap}
        blockedDays={blockedDays ?? []}
      />

      {/* Day detail panel */}
      {viewMode === "day" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToWeek}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Week
            </Button>
            <h2 className="text-lg font-semibold">
              {format(parseISO(selectedDate), "EEEE, d MMMM")}
            </h2>
          </div>

          {/* Slot manager */}
          <SlotManager date={selectedDate} />

          {/* Blocked day banner */}
          {isBlocked && (
            <div
              style={{
                background: "rgba(225,29,72,0.15)",
                border: "1px solid rgba(225,29,72,0.4)",
                borderRadius: "12px",
              }}
              className="flex items-center justify-between p-3"
            >
              <span className="flex items-center gap-1.5" style={{ color: "#e11d48", fontSize: "14px", fontWeight: 600 }}>
                <Ban className="h-4 w-4" />
                Day blocked — no new bookings
              </span>
              <button
                onClick={handleUnblockDay}
                style={{ color: "#e11d48", fontSize: "13px" }}
                className="font-medium underline"
              >
                Remove block
              </button>
            </div>
          )}

          {dayLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !dayBookings || dayBookings.length === 0 ? (
            <>
              <p className="text-muted-foreground py-12 text-center text-sm">
                No sessions on {format(parseISO(selectedDate), "EEEE")}. Tap + to book.
              </p>
              {!isBlocked && (
                <Button
                  variant="outline"
                  className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
                  onClick={() => setBlockDayOpen(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Block day from new bookings
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                {dayBookings.map((b) => {
                  const bTime = new Date(b.date_time)
                  return (
                    <div
                      key={b.id}
                      className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
                      onClick={() => setActionBooking(b)}
                    >
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(bTime, "h:mm a")}</p>
                      </div>
                      <div className={`h-8 w-0.5 rounded-full ${statusDot[b.status] ?? "bg-[#64748B]"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{getClientName(b.client_id)}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {b.duration_mins} min{b.location ? ` · ${b.location}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {b.booking_source === "recurring" && (
                          <span className="text-xs text-cyan-500">↻</span>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {sessionTypeBadge[b.session_type] ?? b.session_type}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
              {!isBlocked && dayBookings.some((b) => ["confirmed", "pending", "upcoming"].includes(b.status)) && (
                <Button
                  variant="outline"
                  className="w-full text-rose-600 border-rose-300 hover:bg-rose-50"
                  onClick={() => setCancelDayOpen(true)}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel all sessions & block day
                </Button>
              )}
            </>
          )}
        </div>
      )}

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
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {/* Cancel day confirmation */}
      <AlertDialog open={cancelDayOpen} onOpenChange={setCancelDayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel all sessions on {selectedDate ? format(parseISO(selectedDate), "EEEE, d MMMM") : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel {dayBookings?.filter((b) => ["confirmed", "pending", "upcoming"].includes(b.status)).length ?? 0} session{(dayBookings?.filter((b) => ["confirmed", "pending", "upcoming"].includes(b.status)).length ?? 0) !== 1 ? "s" : ""} and block the day from new bookings. Each client will receive a WhatsApp notification with your booking link to reschedule.
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
