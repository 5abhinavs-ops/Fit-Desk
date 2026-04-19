"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import {
  ONBOARDING_STEP_KEYS,
  type OnboardingStepKey,
} from "@/lib/onboarding-steps"

type OnboardingStepsMap = Partial<Record<OnboardingStepKey, boolean>>

interface OnboardingRow {
  onboarding_completed: boolean
  onboarding_steps: OnboardingStepsMap
  booking_slug: string | null
}

// jsonb from Postgres arrives as `unknown` — narrow it to our expected shape
// so a malformed row (e.g. manual DB edit) cannot propagate unchecked.
function narrowSteps(raw: unknown): OnboardingStepsMap {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>
  const out: OnboardingStepsMap = {}
  for (const key of ONBOARDING_STEP_KEYS) {
    if (source[key] === true) out[key] = true
  }
  return out
}

function narrowRow(raw: unknown): OnboardingRow | null {
  if (raw == null || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  return {
    onboarding_completed: r.onboarding_completed === true,
    onboarding_steps: narrowSteps(r.onboarding_steps),
    booking_slug: typeof r.booking_slug === "string" ? r.booking_slug : null,
  }
}

export const ONBOARDING_QUERY_KEY = ["onboarding"] as const

async function fetchOnboardingRow(): Promise<OnboardingRow | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_steps, booking_slug")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return narrowRow(data)
}

export interface UseOnboardingReturn {
  isLoading: boolean
  isError: boolean
  onboardingCompleted: boolean
  steps: OnboardingStepsMap
  bookingSlug: string | null
  completeStep: (key: OnboardingStepKey) => void
  dismissChecklist: () => void
}

export function useOnboarding(): UseOnboardingReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: fetchOnboardingRow,
    staleTime: 30_000,
  })

  const completeStep = useMutation({
    mutationFn: async (stepKey: OnboardingStepKey) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Read the canonical row from the DB at mutation time, not from the
      // query cache. Two mutations landing within the 30s staleTime window
      // would otherwise both spread the same stale base, silently clobbering
      // each other (see code-review HIGH #1 for the race).
      const { data: fresh, error: readError } = await supabase
        .from("profiles")
        .select("onboarding_steps")
        .eq("id", user.id)
        .single()
      if (readError) throw readError

      const current = narrowSteps(
        (fresh as { onboarding_steps?: unknown } | null)?.onboarding_steps
      )
      if (current[stepKey] === true) return { noop: true as const }

      const next: OnboardingStepsMap = { ...current, [stepKey]: true }
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_steps: next })
        .eq("id", user.id)

      if (error) throw error
      return { noop: false as const }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
    },
  })

  const dismissChecklist = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY })
    },
  })

  // mutate is reference-stable across renders, so consumers can safely
  // include these in useEffect dep arrays without causing infinite re-runs.
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    onboardingCompleted: query.data?.onboarding_completed ?? false,
    steps: query.data?.onboarding_steps ?? {},
    bookingSlug: query.data?.booking_slug ?? null,
    completeStep: completeStep.mutate,
    dismissChecklist: dismissChecklist.mutate,
  }
}
