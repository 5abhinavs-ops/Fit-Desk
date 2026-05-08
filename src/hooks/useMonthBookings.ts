"use client"

/**
 * useMonthBookings
 *
 * Fetches all bookings for the 42-day (6-row × 7-col) Mon-anchored calendar
 * grid whose visible month is determined by `monthAnchor`.
 *
 * Query key is derived from the grid start date rather than the raw anchor, so
 * two anchors that share the same 42-day grid (e.g. two dates in the same month)
 * hit the same cache entry.
 */

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { getMonthGridStart, addDaysIso } from "@/lib/calendar-grid"
import type { Booking } from "@/types/database"

// ---------------------------------------------------------------------------
// Pure helpers — exported for testing without QueryClient / DOM
// ---------------------------------------------------------------------------

/**
 * Derives the TanStack Query cache key for a given month anchor.
 * Keyed by grid start so adjacent anchors in the same month share cache.
 */
export function getMonthQueryKey(
  monthAnchor: string,
): readonly ["monthBookings", string] {
  const gridStart = getMonthGridStart(monthAnchor) // throws on invalid input
  return ["monthBookings", gridStart] as const
}

/**
 * Returns the inclusive ISO date range for the 42-day grid.
 * gridStart = Monday of the week containing the 1st of the anchor month.
 * gridEnd   = gridStart + 41 days (covers all 42 cells, index 0–41).
 */
export function getMonthRange(monthAnchor: string): {
  gridStart: string
  gridEnd: string
} {
  const gridStart = getMonthGridStart(monthAnchor) // throws on invalid input
  const gridEnd = addDaysIso(gridStart, 41)
  return { gridStart, gridEnd }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches all bookings that fall within the 42-day calendar grid for the
 * month containing `monthAnchor` (any YYYY-MM-DD within that month).
 *
 * Returns standard useQuery result with `data: Booking[]`.
 */
export function useMonthBookings(monthAnchor: string) {
  const supabase = createClient()
  const queryKey = getMonthQueryKey(monthAnchor)
  const { gridStart, gridEnd } = getMonthRange(monthAnchor)

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .gte("date_time", `${gridStart}T00:00:00+08:00`)
        .lte("date_time", `${gridEnd}T23:59:59+08:00`)
        .order("date_time", { ascending: true })

      if (error) throw error
      return data
    },
  })
}
