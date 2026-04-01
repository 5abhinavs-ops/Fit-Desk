"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface ProfilePhotoUploadProps {
  profileId: string
  name: string
  whatsappNumber: string
  initialPhotoUrl: string | null
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

export function ProfilePhotoUpload({ profileId, name, whatsappNumber, initialPhotoUrl }: ProfilePhotoUploadProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

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
      toast.success("Photo updated")
    }
    setUploadingPhoto(false)
  }

  return (
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
  )
}
