"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Copy, Share2 } from "lucide-react"
import type { BookingPaymentMode } from "@/types/database"

interface BookingSettingsFormProps {
  profileId: string
  initialSlug: string
  initialSessionMins: number
  initialPaymentMode: BookingPaymentMode
  initialPaynowDetails: string
}

export function BookingSettingsForm({
  profileId,
  initialSlug,
  initialSessionMins,
  initialPaymentMode,
  initialPaynowDetails,
}: BookingSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [slug, setSlug] = useState(initialSlug)
  const [defaultSessionMins, setDefaultSessionMins] = useState(String(initialSessionMins))
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<BookingPaymentMode>(initialPaymentMode)
  const [paynowDetails, setPaynowDetails] = useState(initialPaynowDetails)

  async function handleSave() {
    const parsedMins = parseInt(defaultSessionMins, 10)
    if (!slug.trim()) {
      toast.error("Booking slug cannot be empty")
      return
    }
    if (isNaN(parsedMins) || parsedMins <= 0) {
      toast.error("Invalid session duration")
      return
    }
    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        booking_slug: slug,
        default_session_mins: parsedMins,
        default_booking_payment_mode: defaultPaymentMode,
        paynow_details: paynowDetails || null,
      })
      .eq("id", profileId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Booking settings saved")
    }
    setSaving(false)
  }

  async function copyLink() {
    const url = `${window.location.origin}/book/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  async function shareLink() {
    const url = `${window.location.origin}/book/${slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Book a session", url })
      } catch {
        // User cancelled share
      }
    } else {
      await copyLink()
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bookingSlug">Slug</Label>
        <Input
          id="bookingSlug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
        <p className="text-muted-foreground text-xs">fitdesk.app/book/{slug || "your-name"}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="mr-1 h-3 w-3" />
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button variant="outline" size="sm" onClick={shareLink}>
          <Share2 className="mr-1 h-3 w-3" />
          Share link
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Default session duration</Label>
        <Select value={defaultSessionMins} onValueChange={(v) => setDefaultSessionMins(v ?? "60")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 min</SelectItem>
            <SelectItem value="45">45 min</SelectItem>
            <SelectItem value="60">60 min</SelectItem>
            <SelectItem value="90">90 min</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Default payment mode</Label>
        <Select value={defaultPaymentMode} onValueChange={(v) => setDefaultPaymentMode((v ?? "pay_later") as BookingPaymentMode)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pay_later">Pay later</SelectItem>
            <SelectItem value="pay_now">Pay now</SelectItem>
            <SelectItem value="from_package">From package</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paynow">PayNow details</Label>
        <Input
          id="paynow"
          placeholder="9123 4567 or T12ABC123D"
          value={paynowDetails}
          onChange={(e) => setPaynowDetails(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">Shown in all payment reminder messages</p>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save booking settings
      </Button>
    </div>
  )
}
