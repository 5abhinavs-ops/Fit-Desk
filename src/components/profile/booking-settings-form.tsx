"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Copy, Share2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import type { BookingPaymentMode } from "@/types/database"

interface BookingSettingsFormProps {
  profileId: string
  initialSlug: string
  initialSessionMins: number
  initialPaymentMode: BookingPaymentMode
  initialPaynowDetails: string
  initialTrainingLocations: string[]
}

export function BookingSettingsForm({
  profileId,
  initialSlug,
  initialSessionMins,
  initialPaymentMode,
  initialPaynowDetails,
  initialTrainingLocations,
}: BookingSettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [slug, setSlug] = useState(initialSlug)
  const [defaultSessionMins, setDefaultSessionMins] = useState(String(initialSessionMins))
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<BookingPaymentMode>(initialPaymentMode)
  const [paynowDetails, setPaynowDetails] = useState(initialPaynowDetails)
  const [locationsInput, setLocationsInput] = useState(initialTrainingLocations.join(", "))

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
        training_locations: locationsInput.split(",").map((s) => s.trim()).filter(Boolean),
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
        <p className="text-muted-foreground text-xs">{(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/^https?:\/\//, "")}/book/{slug || "your-name"}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          {/* 12px inside size="sm" button */}
          <Icon name={Copy} size="sm" className="size-3 mr-1" />
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button variant="outline" size="sm" onClick={shareLink}>
          {/* 12px inside size="sm" button */}
          <Icon name={Share2} size="sm" className="size-3 mr-1" />
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
      <div id="profile-field-training-locations" className="scroll-mt-24 space-y-2">
        <Label htmlFor="locations">Training locations</Label>
        <Input
          id="locations"
          placeholder="Bishan ActiveSG, Client's home, Online"
          value={locationsInput}
          onChange={(e) => setLocationsInput(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">Separate multiple locations with commas</p>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
        Save booking settings
      </Button>
    </div>
  )
}
