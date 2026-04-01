"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2, Copy, Share2, LogOut } from "lucide-react"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import type { Profile, BookingPaymentMode } from "@/types/database"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBooking, setSavingBooking] = useState(false)
  const [copied, setCopied] = useState(false)

  // Editable fields
  const [name, setName] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [bio, setBio] = useState("")
  const [specialisations, setSpecialisations] = useState("")
  const [slug, setSlug] = useState("")
  const [defaultSessionMins, setDefaultSessionMins] = useState("60")
  const [defaultPaymentMode, setDefaultPaymentMode] = useState<BookingPaymentMode>("pay_later")
  const [paynowDetails, setPaynowDetails] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        if (data) {
          const p = data as Profile
          setProfile(p)
          setName(p.name)
          setWhatsappNumber(p.whatsapp_number)
          setBio(p.bio || "")
          setSpecialisations((p.specialisations || []).join(", "))
          setSlug(p.booking_slug)
          setDefaultSessionMins(String(p.default_session_mins))
          setDefaultPaymentMode(p.default_booking_payment_mode)
          setPaynowDetails(p.paynow_details || "")
          setInstagramUrl(p.instagram_url || "")
          setPhotoUrl(p.photo_url || null)
        }
      } catch {
        toast.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  async function saveProfile() {
    if (!profile) return
    const trimmedInstagram = instagramUrl.trim()
    if (trimmedInstagram && !trimmedInstagram.startsWith("https://")) {
      toast.error("Instagram URL must start with https://")
      return
    }
    setSavingProfile(true)
    const supabase = createClient()
    const specArray = specialisations
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        whatsapp_number: whatsappNumber,
        bio: bio || null,
        specialisations: specArray,
        instagram_url: trimmedInstagram || null,
      })
      .eq("id", profile.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Profile saved")
    }
    setSavingProfile(false)
  }

  async function saveBookingSettings() {
    if (!profile) return
    const parsedMins = parseInt(defaultSessionMins, 10)
    if (!slug.trim()) {
      toast.error("Booking slug cannot be empty")
      return
    }
    if (isNaN(parsedMins) || parsedMins <= 0) {
      toast.error("Invalid session duration")
      return
    }
    setSavingBooking(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        booking_slug: slug,
        default_session_mins: parsedMins,
        default_booking_payment_mode: defaultPaymentMode,
        paynow_details: paynowDetails || null,
      })
      .eq("id", profile.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Booking settings saved")
    }
    setSavingBooking(false)
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
        // User cancelled share — no action needed
      }
    } else {
      await copyLink()
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleManageSubscription() {
    try {
      const res = await fetch("/api/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to open billing portal")
      }
    } catch {
      toast.error("Failed to open billing portal")
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    const ALLOWED_TYPES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }
    const safeExt = ALLOWED_TYPES[file.type]
    if (!safeExt) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB")
      return
    }

    setUploadingPhoto(true)
    const supabase = createClient()
    const path = `${profile.id}/avatar.${safeExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error("Failed to upload photo")
      setUploadingPhoto(false)
      return
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ photo_url: publicUrl })
      .eq("id", profile.id)

    if (updateError) {
      toast.error("Failed to save photo")
    } else {
      setPhotoUrl(publicUrl)
      toast.success("Photo updated")
    }
    setUploadingPhoto(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  return (
    <div className="space-y-6 pb-8">
      {/* Section 1 — Trainer profile */}
      <h2 className="text-lg font-semibold">Your profile</h2>
      <div className="flex items-center gap-4">
        <div className="relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="h-16 w-16 rounded-full object-cover border border-border"
            />
          ) : (
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
          )}
          <label
            htmlFor="photoUpload"
            className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {uploadingPhoto ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
          </label>
          <input
            id="photoUpload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
          />
        </div>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-muted-foreground text-sm">{whatsappNumber}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Tap the circle to change photo</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profileName">Name</Label>
          <Input id="profileName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileWa">WhatsApp number</Label>
          <Input id="profileWa" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} onBlur={(e) => setWhatsappNumber(formatWhatsappNumber(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileBio">Bio</Label>
          <Textarea id="profileBio" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileSpecs">Specialisations</Label>
          <Input
            id="profileSpecs"
            placeholder="Weight loss, strength training, HIIT"
            value={specialisations}
            onChange={(e) => setSpecialisations(e.target.value)}
          />
          {specialisations && (
            <div className="flex flex-wrap gap-1 mt-1">
              {specialisations.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagram">Instagram</Label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            <Input
              id="instagram"
              className="pl-9"
              placeholder="https://instagram.com/yourhandle"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
            />
          </div>
          {instagramUrl && instagramUrl.startsWith("https://") && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Preview link ↗
            </a>
          )}
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </div>

      <Separator />

      {/* Section 2 — Booking settings */}
      <h2 className="text-lg font-semibold">Your booking link</h2>
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
        <Button onClick={saveBookingSettings} disabled={savingBooking}>
          {savingBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save booking settings
        </Button>
      </div>

      <Separator />

      {/* Section 3 — Subscription */}
      <h2 className="text-lg font-semibold">Subscription</h2>
      <Card>
        <CardContent className="p-4 space-y-3">
          {profile?.subscription_plan === "pro" ? (
            <>
              <Badge className="bg-green-100 text-green-800">Pro</Badge>
              <p className="text-sm">Unlimited clients. All features active.</p>
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage subscription
              </Button>
            </>
          ) : (
            <>
              <Badge variant="secondary">Free plan</Badge>
              <p className="text-sm">3 clients maximum. Upgrade for unlimited.</p>
              <Button onClick={() => router.push("/upgrade")}>
                Upgrade to Pro — $19/month
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 4 — Account */}
      <h2 className="text-lg font-semibold">Account</h2>
      <div className="space-y-3">
        <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        <p className="text-muted-foreground text-xs">v1.0.0</p>
      </div>
    </div>
  )
}
