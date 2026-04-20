"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Check,
  Copy,
  Loader2,
  PartyPopper,
  Share2,
  Sparkles,
  Users,
} from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import { isValidE164Phone } from "@/lib/phone-validate"
import { buildDemoClientPayload } from "@/lib/onboarding-demo-seed"
import {
  PACKAGE_PRESETS,
  buildPackagePayload,
  formatPresetLabel,
  type PackagePreset,
} from "@/lib/package-presets"
import { buildWhatsappShareUrl } from "@/lib/whatsapp-share"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3

interface SessionState {
  userId: string
  slug: string
}

interface NewClient {
  id: string
  first_name: string
}

const TOTAL_STEPS = 3

function ProgressHeader({ step }: { step: Step }) {
  const completedBefore = step - 1
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FitDeskLogo size="sm" />
        <p className="text-micro text-muted-foreground">
          {completedBefore} of {TOTAL_STEPS} steps complete
        </p>
      </div>
      <div className="flex items-center gap-2" aria-hidden>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < step
                ? "bg-[color:var(--fd-cyan)]"
                : i === step
                  ? "bg-[color:var(--fd-cyan)]/50"
                  : "bg-[color:var(--fd-border)]",
            )}
          />
        ))}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [session, setSession] = useState<SessionState | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [client, setClient] = useState<NewClient | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login")
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("booking_slug")
        .eq("id", user.id)
        .single()

      setSession({
        userId: user.id,
        slug:
          typeof profile?.booking_slug === "string" && profile.booking_slug.length > 0
            ? profile.booking_slug
            : user.id.slice(0, 8),
      })
    })
  }, [router])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name={Loader2} size="lg" className="animate-spin text-[color:var(--fd-cyan)]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4">
      <div className="w-full max-w-sm space-y-6 py-6">
        <ProgressHeader step={step} />

        {step === 1 && (
          <Step1AddClient
            userId={session.userId}
            onComplete={(newClient) => {
              setClient(newClient)
              setStep(2)
            }}
          />
        )}

        {step === 2 && client && (
          <Step2CreatePackage
            userId={session.userId}
            client={client}
            onComplete={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3ShareLink
            slug={session.slug}
            onDone={() => router.push("/")}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Add your first client
// ---------------------------------------------------------------------------

function Step1AddClient({
  userId,
  onComplete,
}: {
  userId: string
  onComplete: (client: NewClient) => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    whatsapp.trim().length > 0

  async function insertClient(
    payload: Record<string, unknown>,
  ): Promise<NewClient | null> {
    // Re-resolve the session at insert time — pinning userId at mount would
    // silently mismatch RLS if the session rotates to a different account
    // (shared device, multi-tab, or token refresh edge cases).
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      toast.error("Your session changed — please sign in again.")
      return null
    }
    const row = { ...payload, trainer_id: user.id } as Record<string, unknown>
    const { data, error } = await supabase
      .from("clients")
      .insert(row)
      .select("id, first_name")
      .single()

    if (error) {
      toast.error(error.message || "Could not add client")
      return null
    }
    return { id: data.id as string, first_name: data.first_name as string }
  }

  async function handleAddReal(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || submitting) return
    const normalised = formatWhatsappNumber(whatsapp)
    if (!isValidE164Phone(normalised)) {
      toast.error("Enter a valid WhatsApp number with country code, e.g. +65 9123 4567")
      return
    }
    setSubmitting(true)
    const created = await insertClient({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      whatsapp_number: normalised,
      email: null,
      goals: null,
      injuries_medical: null,
      photo_url: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      status: "active",
      whatsapp_opted_out: false,
    })
    setSubmitting(false)
    if (created) {
      toast.success(`${created.first_name} added`)
      onComplete(created)
    }
  }

  async function handleAddDemo() {
    if (loadingDemo) return
    setLoadingDemo(true)
    const created = await insertClient({ ...buildDemoClientPayload() })
    setLoadingDemo(false)
    if (created) {
      toast.success("Demo client added — you can delete them later")
      onComplete(created)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[color:var(--fd-cyan)]">
          <Icon name={Users} size="sm" />
          <p className="text-micro font-semibold uppercase tracking-wider">Step 1</p>
        </div>
        <h1 className="text-2xl font-semibold">Add your first client</h1>
        <p className="text-sm text-muted-foreground">
          Takes 30 seconds. You can edit details later.
        </p>
      </header>

      <form onSubmit={handleAddReal} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              autoComplete="off"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              autoComplete="off"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            type="tel"
            inputMode="tel"
            placeholder="+65 9123 4567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            onBlur={(e) => setWhatsapp(formatWhatsappNumber(e.target.value))}
          />
        </div>

        <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
          {submitting && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
          Add real client
        </Button>
      </form>

      <div className="flex items-center gap-3 text-micro text-muted-foreground">
        <span className="h-px flex-1 bg-[color:var(--fd-border)]" />
        <span>or</span>
        <span className="h-px flex-1 bg-[color:var(--fd-border)]" />
      </div>

      <button
        type="button"
        onClick={handleAddDemo}
        disabled={loadingDemo}
        className="group flex w-full items-start gap-3 rounded-xl border border-[color:var(--fd-border)] bg-[color:var(--fd-surface-hi)] p-4 text-left transition-colors hover:bg-[color:var(--fd-surface-hi)]/80 disabled:opacity-60"
      >
        <div className="mt-0.5 rounded-lg bg-[color:var(--fd-cyan)]/10 p-2 text-[color:var(--fd-cyan)]">
          <Icon name={Sparkles} size="sm" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Try with a demo client</p>
          <p className="text-micro text-muted-foreground">
            Creates a placeholder so you can explore packages + the booking page
            right away.
          </p>
        </div>
        {loadingDemo && <Icon name={Loader2} size="sm" className="animate-spin" />}
      </button>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Create a package
// ---------------------------------------------------------------------------

function Step2CreatePackage({
  userId,
  client,
  onComplete,
}: {
  userId: string
  client: NewClient
  onComplete: () => void
}) {
  const [selected, setSelected] = useState<PackagePreset>(PACKAGE_PRESETS[0])
  const [customOpen, setCustomOpen] = useState(false)
  const [customSessions, setCustomSessions] = useState("12")
  const [customPrice, setCustomPrice] = useState("900")
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (submitting) return
    const sessions = customOpen ? Number(customSessions) : selected.sessions
    const price = customOpen ? Number(customPrice) : selected.price

    if (customOpen) {
      if (!Number.isFinite(sessions) || sessions < 1) {
        toast.error("Enter a session count of 1 or more")
        return
      }
      if (!Number.isFinite(price) || price < 0) {
        toast.error("Enter a price of 0 or more")
        return
      }
    }

    setSubmitting(true)
    let payload
    try {
      payload = buildPackagePayload({
        clientId: client.id,
        firstName: client.first_name,
        sessions,
        price,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid package")
      setSubmitting(false)
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      setSubmitting(false)
      toast.error("Your session changed — please sign in again.")
      return
    }

    const { error } = await supabase.from("packages").insert({
      ...payload,
      trainer_id: user.id,
      sessions_used: 0,
      amount_paid: 0,
      payment_status: "unpaid",
      status: "active",
    })

    setSubmitting(false)
    if (error) {
      toast.error(error.message || "Could not create package")
      return
    }
    toast.success("Package created")
    onComplete()
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[color:var(--fd-cyan)]">
          <Icon name={Sparkles} size="sm" />
          <p className="text-micro font-semibold uppercase tracking-wider">Step 2</p>
        </div>
        <h1 className="text-2xl font-semibold">
          Create a package for {client.first_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick a preset or customise. You can change this anytime.
        </p>
      </header>

      <div className="space-y-3" role="radiogroup" aria-label="Package preset">
        {PACKAGE_PRESETS.map((preset) => {
          const active = !customOpen && selected.sessions === preset.sessions
          return (
            <button
              key={preset.sessions}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setSelected(preset)
                setCustomOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-[color:var(--fd-cyan)] bg-[color:var(--fd-cyan)]/10"
                  : "border-[color:var(--fd-border)] bg-[color:var(--fd-surface-hi)] hover:bg-[color:var(--fd-surface-hi)]/80",
              )}
            >
              <div>
                <p className="text-sm font-semibold">{preset.label}</p>
                <p className="text-micro text-muted-foreground">
                  {formatPresetLabel(preset)}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  active
                    ? "border-[color:var(--fd-cyan)] bg-[color:var(--fd-cyan)] text-[color:var(--background)]"
                    : "border-[color:var(--fd-border)]",
                )}
              >
                {active && <Icon name={Check} size="sm" className="size-3" />}
              </div>
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors",
            customOpen
              ? "border-[color:var(--fd-cyan)] bg-[color:var(--fd-cyan)]/10"
              : "border-[color:var(--fd-border)] bg-[color:var(--fd-surface-hi)] hover:bg-[color:var(--fd-surface-hi)]/80",
          )}
        >
          <div>
            <p className="text-sm font-semibold">Custom</p>
            <p className="text-micro text-muted-foreground">
              Set your own sessions + price
            </p>
          </div>
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border",
              customOpen
                ? "border-[color:var(--fd-cyan)] bg-[color:var(--fd-cyan)] text-[color:var(--background)]"
                : "border-[color:var(--fd-border)]",
            )}
          >
            {customOpen && <Icon name={Check} size="sm" className="size-3" />}
          </div>
        </button>

        {customOpen && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[color:var(--fd-border)] bg-[color:var(--fd-surface)] p-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom-sessions">Sessions</Label>
              <Input
                id="custom-sessions"
                type="number"
                inputMode="numeric"
                min={1}
                value={customSessions}
                onChange={(e) => setCustomSessions(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-price">Price ($)</Label>
              <Input
                id="custom-price"
                type="number"
                inputMode="decimal"
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <Button onClick={handleCreate} disabled={submitting} className="w-full">
        {submitting && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
        Create package
      </Button>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Share booking page
// ---------------------------------------------------------------------------

function Step3ShareLink({
  slug,
  onDone,
}: {
  slug: string
  onDone: () => void
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const url = useMemo(() => `${baseUrl.replace(/\/$/, "")}/book/${slug}`, [baseUrl, slug])
  const [copied, setCopied] = useState(false)

  const waShare = buildWhatsappShareUrl(
    url,
    "Hey! Book your training sessions with me here:",
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Link copied")
    } catch {
      toast.error("Copy failed — tap to select and copy manually")
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[color:var(--fd-cyan)]">
          <Icon name={Share2} size="sm" />
          <p className="text-micro font-semibold uppercase tracking-wider">Step 3</p>
        </div>
        <h1 className="text-2xl font-semibold">Share your booking page</h1>
        <p className="text-sm text-muted-foreground">
          Drop this link into your WhatsApp status or a PT group. Clients can
          self-book from their phone.
        </p>
      </header>

      <div className="rounded-xl border border-[color:var(--fd-border)] bg-[color:var(--fd-surface-hi)] p-4 space-y-3">
        <p className="break-all text-sm font-mono text-white/90">{url}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--fd-border)] bg-[color:var(--fd-surface)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--fd-surface)]/80"
        >
          <Icon name={copied ? Check : Copy} size="sm" />
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>

      <a
        href={waShare}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gradient flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors"
      >
        <Icon name={Share2} size="sm" />
        Send to WhatsApp
      </a>

      <Button
        variant="ghost"
        onClick={onDone}
        className="w-full"
      >
        Skip for now
      </Button>

      <button
        type="button"
        onClick={onDone}
        className="flex w-full items-center justify-center gap-2 text-sm text-[color:var(--fd-cyan)] hover:underline"
      >
        <Icon name={PartyPopper} size="sm" />
        All done — open my dashboard
      </button>
    </section>
  )
}
