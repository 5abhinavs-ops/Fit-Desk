"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Copy, Check } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [paynowDetails, setPaynowDetails] = useState("")
  const [defaultPaymentMode, setDefaultPaymentMode] = useState("pay_later")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login")
        return
      }
      const name = (user.user_metadata?.name as string) || ""
      const slugified = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      setSlug(slugified)
    })
  }, [router])

  async function handleSubmit() {
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error("Not authenticated")
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        paynow_details: paynowDetails || null,
        default_booking_payment_mode: defaultPaymentMode,
        booking_slug: slug,
      })
      .eq("id", user.id)

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push("/")
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const baseUrlDisplay = baseUrl.replace(/^https?:\/\//, "")

  async function handleCopyLink() {
    const url = `${baseUrl}/book/${slug || "your-name"}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  // Step 1 — Welcome
  if (step === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8 text-center">
          <FitDeskLogo size="lg" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Welcome to FitDesk</h1>
            <p className="text-muted-foreground text-sm">
              Let&apos;s set up your account in 3 quick steps.
            </p>
          </div>
          <Button className="w-full" onClick={() => setStep(2)}>
            Get started →
          </Button>
        </div>
      </div>
    )
  }

  // Step 2 — Payment setup
  if (step === 2) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name={ArrowLeft} size="sm" />
            Back
          </button>

          <p className="text-xs text-muted-foreground">Step 1 of 2</p>
          <h1 className="text-xl font-semibold">How will clients pay you?</h1>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paynow">PayNow number</Label>
              <Input
                id="paynow"
                type="text"
                placeholder="9123 4567 or T12ABC123D"
                value={paynowDetails}
                onChange={(e) => setPaynowDetails(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Used in payment reminder messages to clients
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default payment mode</Label>
              <Select value={defaultPaymentMode} onValueChange={(v) => setDefaultPaymentMode(v ?? "pay_later")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay_later">Pay later — cash, PayNow or bank transfer</SelectItem>
                  <SelectItem value="pay_now">Pay now — Stripe card payment at booking</SelectItem>
                  <SelectItem value="from_package">From session package</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="w-full" onClick={() => setStep(3)}>
            Next →
          </Button>
        </div>
      </div>
    )
  }

  // Step 3 — Booking link
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name={ArrowLeft} size="sm" />
          Back
        </button>

        <p className="text-xs text-muted-foreground">Step 2 of 2</p>
        <h1 className="text-xl font-semibold">Your booking link</h1>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Booking link slug</Label>
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
            <p className="text-sm flex-1 truncate">
              {baseUrlDisplay}/book/<span className="font-semibold">{slug || "your-name"}</span>
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Copy link"
            >
              {copied ? <Icon name={Check} size="sm" className="text-green-500" /> : <Icon name={Copy} size="sm" />}
            </button>
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={loading}>
          {loading && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
          All done — open my dashboard →
        </Button>
      </div>
    </div>
  )
}
