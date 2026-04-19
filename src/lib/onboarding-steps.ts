export const ONBOARDING_STEPS = {
  CLIENT_ADDED: "client_added",
  AVAILABILITY_SET: "availability_set",
  LINK_SHARED: "link_shared",
} as const

export type OnboardingStepKey =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS]

export const ONBOARDING_STEP_KEYS: readonly OnboardingStepKey[] = [
  ONBOARDING_STEPS.CLIENT_ADDED,
  ONBOARDING_STEPS.AVAILABILITY_SET,
  ONBOARDING_STEPS.LINK_SHARED,
] as const

export function countCompletedSteps(
  steps: Partial<Record<OnboardingStepKey, boolean>> | null | undefined
): number {
  if (!steps) return 0
  return ONBOARDING_STEP_KEYS.reduce(
    (count, key) => count + (steps[key] === true ? 1 : 0),
    0
  )
}

export function isAllStepsComplete(
  steps: Partial<Record<OnboardingStepKey, boolean>> | null | undefined
): boolean {
  return countCompletedSteps(steps) === ONBOARDING_STEP_KEYS.length
}
