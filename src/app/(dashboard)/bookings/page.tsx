"use client"

import { useState } from "react"
import { useBookings } from "@/hooks/useBookings"
import { useWeekBookings, getWeekStart } from "@/hooks/useWeekBookings"
import { useClients } from "@/hooks/useClients"
import { WeekHeatmap } from "@/components/calendar/WeekHeatmap"
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
import { Plus, ChevronLeft, ChevronRight, Copy, Loader2 } from "lucide-react"
import { format, addDays, parseISO } from "date-fns"
import type { Booking } from "@/types/database"

const statusDot: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  cancelled: "bg-gray-400",
  completed: "bg-green-500",
  "no-show": "bg-red-500",
  no_show: "bg-red-500",
  upcoming: "bg-green-500",
  forfeited: "bg-gray-400",
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
  const todayStr = getSGTToday()
  const [viewMode, setViewMode] = useState<"week" | "day">("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [actionBooking, setActionBooking] = useState<Booking | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [copyPending, setCopyPending] = useState(false)
  const queryClient = useQueryClient()

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
    setSelectedDate(todayStr)
    setViewMode("week")
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

          {dayLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !dayBookings || dayBookings.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              No sessions on {format(parseISO(selectedDate), "EEEE")}. Tap + to book.
            </p>
          ) : (
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
                    <div className={`h-8 w-0.5 rounded-full ${statusDot[b.status] ?? "bg-gray-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{getClientName(b.client_id)}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {b.duration_mins} min{b.location ? ` · ${b.location}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {sessionTypeBadge[b.session_type] ?? b.session_type}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
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
