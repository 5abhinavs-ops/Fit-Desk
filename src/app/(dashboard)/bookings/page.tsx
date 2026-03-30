"use client"

import { useState } from "react"
import { useBookings } from "@/hooks/useBookings"
import { useClients } from "@/hooks/useClients"
import { BookingActionSheet } from "@/components/clients/BookingActionSheet"
import { CreateBookingSheet } from "@/components/clients/CreateBookingSheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, isSameDay } from "date-fns"
import type { Booking } from "@/types/database"

const statusDot: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-amber-500",
  cancelled: "bg-gray-400",
  completed: "bg-green-500",
  "no-show": "bg-red-500",
}

const sessionTypeBadge: Record<string, string> = {
  "1-on-1": "1-on-1",
  group: "Group",
  assessment: "Assessment",
}

export default function BookingsPage() {
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const { data: bookings, isLoading } = useBookings(selectedDate)
  const { data: clients } = useClients()
  const [actionBooking, setActionBooking] = useState<Booking | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, weekOffset + i)
    return {
      date: format(d, "yyyy-MM-dd"),
      dayName: format(d, "EEE"),
      dayNum: format(d, "d"),
      isToday: isSameDay(d, today),
    }
  })

  function getClientName(clientId: string): string {
    const c = clients?.find((cl) => cl.id === clientId)
    return c ? `${c.first_name} ${c.last_name}` : "Unknown"
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Calendar</h1>

      {/* Week navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setWeekOffset((o) => Math.max(o - 7, -21))}
          disabled={weekOffset <= -21}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 gap-1 overflow-x-auto">
          {weekDays.map((d) => (
            <button
              key={d.date}
              onClick={() => setSelectedDate(d.date)}
              className={`flex min-w-[3rem] flex-1 flex-col items-center rounded-lg px-2 py-2 text-sm transition-colors ${
                selectedDate === d.date
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <span className="text-xs">{d.dayName}</span>
              <span className="text-lg font-semibold">{d.dayNum}</span>
              {d.isToday && (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  selectedDate === d.date ? "bg-primary-foreground" : "bg-primary"
                }`} />
              )}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setWeekOffset((o) => o + 7)}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {weekOffset !== 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => { setWeekOffset(0); setSelectedDate(todayStr) }}
        >
          Back to today
        </Button>
      )}

      {/* Booking list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No sessions on {format(new Date(selectedDate + "T12:00:00"), "EEEE")}. Tap + to book.
        </p>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => {
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
                <div className={`h-8 w-0.5 rounded-full ${statusDot[b.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{getClientName(b.client_id)}</p>
                  <p className="text-muted-foreground text-xs truncate">
                    {b.duration_mins} min{b.location ? ` · ${b.location}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {sessionTypeBadge[b.session_type] ?? b.session_type}
                </Badge>
              </div>
            )
          })}
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
    </div>
  )
}
