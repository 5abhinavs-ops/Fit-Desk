/**
 * One-tap package presets shown in onboarding Step 2. Sized and priced to
 * match the SEA solo-PT market baseline — see Phase 1 plan in CLAUDE.md.
 */

export interface PackagePreset {
  readonly label: string
  readonly sessions: number
  readonly price: number
}

export const PACKAGE_PRESETS: readonly PackagePreset[] = [
  { label: "Starter", sessions: 10, price: 800 },
  { label: "Committed", sessions: 20, price: 1500 },
]

export function formatPresetLabel(preset: PackagePreset): string {
  return `${preset.sessions} sessions · $${preset.price}`
}

export interface BuildPackageInput {
  clientId: string
  firstName: string
  sessions: number
  price: number
}

export interface PackagePayload {
  client_id: string
  name: string
  total_sessions: number
  price: number
  start_date: string
  expiry_date: string | null
}

function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function buildPackagePayload(input: BuildPackageInput): PackagePayload {
  if (!Number.isFinite(input.sessions) || input.sessions <= 0) {
    throw new Error("sessions must be positive")
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error("price must be >= 0")
  }
  const firstName = input.firstName.trim() || "Client"
  return {
    client_id: input.clientId,
    name: `${firstName} — ${input.sessions}-session pack`,
    total_sessions: input.sessions,
    price: input.price,
    start_date: todayIsoDate(),
    expiry_date: null,
  }
}
