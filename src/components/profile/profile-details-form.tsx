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
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"

interface ProfileDetailsFormProps {
  profileId: string
  initialName: string
  initialWhatsapp: string
  initialBio: string
  initialSpecialisations: string
  initialInstagramUrl: string
}

export function ProfileDetailsForm({
  profileId,
  initialName,
  initialWhatsapp,
  initialBio,
  initialSpecialisations,
  initialInstagramUrl,
}: ProfileDetailsFormProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(initialName)
  const [whatsappNumber, setWhatsappNumber] = useState(initialWhatsapp)
  const [bio, setBio] = useState(initialBio)
  const [specialisations, setSpecialisations] = useState(initialSpecialisations)
  const [instagramUrl, setInstagramUrl] = useState(initialInstagramUrl)

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

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        whatsapp_number: whatsappNumber,
        bio: bio || null,
        specialisations: specArray,
        instagram_url: trimmedInstagram || null,
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
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save profile
      </Button>
    </div>
  )
}
