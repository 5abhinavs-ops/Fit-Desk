"use client"

import type { Booking } from "@/types/database"
import { useUpdateBookingStatus } from "@/hooks/useBookings"
import { useLogSession } from "@/hooks/usePackages"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

interface BookingActionSheetProps {
  booking: Booking
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookingActionSheet({ booking, clientName, open, onOpenChange }: BookingActionSheetProps) {
  const updateStatus = useUpdateBookingStatus()
  const logSession = useLogSession()

  const bookingTime = new Date(booking.date_time)
  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const canAct =
    (booking.status === "confirmed" || booking.status === "pending") &&
    bookingTime >= twoHoursAgo

  function handleComplete() {
    updateStatus.mutate(
      { id: booking.id, status: "completed" },
      {
        onSuccess: () => {
          if (booking.package_id) {
            logSession.mutate(booking.package_id, {
              onSuccess: () => {
                toast.success("Session marked complete")
                onOpenChange(false)
              },
              onError: () => {
                toast.warning("Session marked complete but package count may not have updated")
                onOpenChange(false)
              },
            })
          } else {
            toast.success("Session marked complete")
            onOpenChange(false)
          }
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed"),
      }
    )
  }

  function handleCancel() {
    updateStatus.mutate(
      { id: booking.id, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success("Session cancelled")
          onOpenChange(false)
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed"),
      }
    )
  }

  function handleNoShow() {
    updateStatus.mutate(
      { id: booking.id, status: "no-show" },
      {
        onSuccess: () => {
          toast.success("Marked as no-show")
          onOpenChange(false)
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Failed"),
      }
    )
  }

  const isPending = updateStatus.isPending || logSession.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{clientName}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-4">
          <div className="text-sm">
            <p>{format(bookingTime, "EEEE, d MMMM yyyy · h:mm a")}</p>
            {booking.location && (
              <p className="text-muted-foreground">{booking.location}</p>
            )}
            <Badge variant="secondary" className="mt-2">
              {booking.status}
            </Badge>
          </div>

          {canAct ? (
            <div className="space-y-2">
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleComplete}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark complete
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel session
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700"
                onClick={handleNoShow}
                disabled={isPending}
              >
                No-show
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {booking.status === "completed"
                ? "This session is complete."
                : booking.status === "cancelled"
                  ? "This session was cancelled."
                  : booking.status === "no-show"
                    ? "This session was a no-show."
                    : "No actions available."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
