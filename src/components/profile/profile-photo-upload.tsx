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

    // Derive the storage path + update target from the AUTHENTICATED user id,
    // not the `profileId` prop. The prop is under parent-component control and
    // could be spoofed via direct component re-render; the auth user id is
    // server-verified. This closes the storage-path-injection vector flagged
    // by security-reviewer in the Phase H-M consolidated audit.
    const { data: authUser } = await supabase.auth.getUser()
    const authenticatedId = authUser?.user?.id
    if (!authenticatedId) {
      toast.error("Please sign in again to upload a photo")
      setUploadingPhoto(false)
      return
    }
    // Defence-in-depth: if the parent passed a different profileId than the
    // authenticated user, refuse to upload. We always use the auth id anyway,
    // but surfacing the mismatch catches integration bugs early.
    if (profileId !== authenticatedId) {
      toast.error("Can only upload photos to your own profile")
      setUploadingPhoto(false)
      return
    }
    const path = `${authenticatedId}/avatar.${safeExt}`

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
      .eq("id", authenticatedId)

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
          <span className="text-sm font-semibold">Upload your profile picture</span>
          <span className="text-center text-xs text-muted-foreground">
            Appears on your public booking page so clients can recognise you before their session. JPG, PNG, WebP or GIF — max 5MB.
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
