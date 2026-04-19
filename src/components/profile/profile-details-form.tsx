"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"

const TESTIMONIAL_PLACEHOLDER =
  "Paste a WhatsApp message a client sent you, or ask them: 'Can you send me one sentence about training with me?'"

interface ProfileDetailsFormProps {
  profileId: string
  initialName: string
  initialWhatsapp: string
  initialBio: string
  initialSpecialisations: string
  initialInstagramUrl: string
  initialBookingHeadline: string
  initialWhyTrainWithMe: string
  initialPricingFrom: string
  initialTestimonial1: string
  initialTestimonial2: string
  initialTestimonial3: string
}

export function ProfileDetailsForm({
  profileId,
  initialName,
  initialWhatsapp,
  initialBio,
  initialSpecialisations,
  initialInstagramUrl,
  initialBookingHeadline,
  initialWhyTrainWithMe,
  initialPricingFrom,
  initialTestimonial1,
  initialTestimonial2,
  initialTestimonial3,
}: ProfileDetailsFormProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(initialName)
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsapp)
  const [bio, setBio] = useState(initialBio)
  const [specialisations, setSpecialisations] = useState(initialSpecialisations)
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl)
  const [bookingHeadline, setBookingHeadline] = useState(initialBookingHeadline)
  const [whyTrainWithMe, setWhyTrainWithMe] = useState(initialWhyTrainWithMe)
  const [pricingFrom, setPricingFrom] = useState(initialPricingFrom)
  const [testimonial1, setTestimonial1] = useState(initialTestimonial1)
  const [testimonial2, setTestimonial2] = useState(initialTestimonial2)
  const [testimonial3, setTestimonial3] = useState(initialTestimonial3)

  async function handleSave() {
    const trimmedInstagram = instagramUrl.trim()
    if (trimmedInstagram && !trimmedInstagram.startsWith("https://")) {
      toast.error("Instagram URL must start with https://")
      return
    }
    setSaving(true)
    const supabase = createClient()
    const specArray = specialisations
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const parsedPrice = pricingFrom ? parseFloat(pricingFrom) : null
    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        whatsapp_number: whatsappNumber,
        bio: bio || null,
        specialisations: specArray,
        instagram_url: trimmedInstagram || null,
        booking_headline: bookingHeadline || null,
        why_train_with_me: whyTrainWithMe || null,
        pricing_from: parsedPrice,
        testimonial_1: testimonial1 || null,
        testimonial_2: testimonial2 || null,
        testimonial_3: testimonial3 || null,
      })
      .eq("id", profileId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Profile saved")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profileName">Name</Label>
        <Input id="profileName" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profileWa">WhatsApp number</Label>
        <Input id="profileWa" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} onBlur={(e) => setWhatsappNumber(formatWhatsappNumber(e.target.value))} />
      </div>
      <div id="profile-field-bio" className="scroll-mt-24 space-y-2">
        <Label htmlFor="profileBio">Bio</Label>
        <Textarea id="profileBio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div id="profile-field-specialisations" className="scroll-mt-24 space-y-2">
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
      <div className="space-y-2">
        <Label htmlFor="bookingHeadline">Booking page headline</Label>
        <Input
          id="bookingHeadline"
          placeholder="Singapore's top HIIT coach"
          value={bookingHeadline}
          onChange={(e) => setBookingHeadline(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whyTrainWithMe">Why train with me</Label>
        <Textarea
          id="whyTrainWithMe"
          placeholder="Tell potential clients why they should book with you"
          value={whyTrainWithMe}
          onChange={(e) => setWhyTrainWithMe(e.target.value)}
        />
      </div>
      <div id="profile-field-pricing" className="scroll-mt-24 space-y-2">
        <Label htmlFor="pricingFrom">Pricing from (SGD)</Label>
        <Input
          id="pricingFrom"
          type="number"
          min={0}
          step="0.01"
          placeholder="80"
          value={pricingFrom}
          onChange={(e) => setPricingFrom(e.target.value)}
        />
      </div>
      <div id="profile-field-testimonial-1" className="scroll-mt-24 space-y-2">
        <Label htmlFor="testimonial1">Testimonial 1</Label>
        <Textarea
          id="testimonial1"
          placeholder={TESTIMONIAL_PLACEHOLDER}
          className="min-h-[88px] resize-y"
          value={testimonial1}
          onChange={(e) => setTestimonial1(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="testimonial2">Testimonial 2</Label>
        <Textarea
          id="testimonial2"
          placeholder={TESTIMONIAL_PLACEHOLDER}
          className="min-h-[88px] resize-y"
          value={testimonial2}
          onChange={(e) => setTestimonial2(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="testimonial3">Testimonial 3</Label>
        <Textarea
          id="testimonial3"
          placeholder={TESTIMONIAL_PLACEHOLDER}
          className="min-h-[88px] resize-y"
          value={testimonial3}
          onChange={(e) => setTestimonial3(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
        Save profile
      </Button>
    </div>
  )
}
