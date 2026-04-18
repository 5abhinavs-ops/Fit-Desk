"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"
import { Icon } from "@/components/ui/icon"

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
            // 12px inside 24px avatar badge
            <Icon name={Loader2} size="sm" className="size-3 animate-spin" />
          ) : (
            // 12px upload glyph inside 24px avatar badge
            <Icon name={Upload} size="sm" className="size-3" />
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
