"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Camera, Loader2, Upload } from "lucide-react"
import { Icon } from "@/components/ui/icon"

interface ProfilePhotoUploadProps {
  profileId: string
  name: string
  whatsappNumber: string
  initialPhotoUrl: string | null
  /** Called after a successful upload so parent state (e.g. completeness) can update */
  onPhotoUrlChange?: (url: string | null) => void
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export function ProfilePhotoUpload({
  profileId,
  name,
  whatsappNumber,
  initialPhotoUrl,
  onPhotoUrlChange,
}: ProfilePhotoUploadProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

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
    const path = `${profileId}/avatar.${safeExt}`

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
      .eq("id", profileId)

    if (updateError) {
      toast.error("Failed to save photo")
    } else {
      setPhotoUrl(publicUrl)
      onPhotoUrlChange?.(publicUrl)
      toast.success("Photo updated")
    }
    setUploadingPhoto(false)
  }

  return (
    <div id="profile-field-photo" className="scroll-mt-24 space-y-3">
      {!photoUrl ? (
        <label
          htmlFor="profile-photo-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-10 transition-colors hover:border-primary/50 hover:bg-muted/35 active:bg-muted/45"
        >
          {uploadingPhoto ? (
            <Icon name={Loader2} size="lg" className="size-10 animate-spin text-muted-foreground" />
          ) : (
            <Icon name={Camera} size="lg" className="size-10 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">Tap to add photo</span>
          <span className="text-center text-xs text-muted-foreground">
            JPG, PNG, WebP or GIF — max 5MB. Shown on your booking page.
          </span>
        </label>
      ) : null}

      <input
        id="profile-photo-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
        disabled={uploadingPhoto}
      />

      {!photoUrl ? (
        <div className="space-y-0.5">
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{whatsappNumber}</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={photoUrl}
              alt={name}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
            <label
              htmlFor="profile-photo-input"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {uploadingPhoto ? (
                <Icon name={Loader2} size="sm" className="size-3 animate-spin" />
              ) : (
                <Icon name={Upload} size="sm" className="size-3" />
              )}
            </label>
          </div>
          <div>
            <p className="font-semibold">{name}</p>
            <p className="text-muted-foreground text-sm">{whatsappNumber}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">Tap the circle to change photo</p>
          </div>
        </div>
      )}
    </div>
  )
}
