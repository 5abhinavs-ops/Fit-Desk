"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"

export default function OnboardingPage() {
  const router = useRouter()
  const [paynowDetails, setPaynowDetails] = useState("")
  const [defaultPaymentMode, setDefaultPaymentMode] = useState("pay_later")
  const [slug, setSlug] = useState("")
  const [loading, setLoading] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <FitDeskLogo size="lg" />
          <div className="text-center">
            <h1 className="text-xl font-bold">Set up your profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Takes 60 seconds. You can change this later.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="slug">Booking link slug</Label>
            <Input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Your booking link: fitdesk.app/book/{slug || "your-name"}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Let&apos;s go
          </Button>
        </form>
      </div>
    </div>
  )
}
