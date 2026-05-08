"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"
import {
  parseCalendarUrlState,
  serializeCalendarUrlState,
  type CalendarUrlState,
  type CalendarView,
} from "@/lib/calendar-url"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface UseCalendarUrlStateResult {
  state: CalendarUrlState
  setState: (next: CalendarUrlState) => void
  setView: (view: CalendarView) => void
  setDate: (date: string) => void
}

/**
 * Reads + writes the calendar's `view` and `date` URL search params.
 *
 * Read path: useSearchParams() + parseCalendarUrlState (always returns a
 * resolved state, never undefined).
 *
 * Write path: router.replace() — single-screen mode toggle, browser back
 * should exit the calendar entirely rather than walk through view changes.
 */
export function useCalendarUrlState(): UseCalendarUrlStateResult {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const state = useMemo<CalendarUrlState>(
    () => parseCalendarUrlState(searchParams),
    [searchParams],
  )

  const setState = useCallback(
    (next: CalendarUrlState) => {
      const qs = serializeCalendarUrlState(next)
      router.replace(`${pathname}?${qs}`, { scroll: false })
    },
    [router, pathname],
  )

  const setView = useCallback(
    (view: CalendarView) => {
      setState({ view, date: state.date })
    },
    [setState, state.date],
  )

  const setDate = useCallback(
    (date: string) => {
      setState({ view: state.view, date })
    },
    [setState, state.view],
  )

  return { state, setState, setView, setDate }
}
