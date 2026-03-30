import { cache } from "react"
import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { BookingForm } from "@/components/BookingForm"
import { Badge } from "@/components/ui/badge"

interface BookingPageProps {
  params: Promise<{ slug: string }>
}

const getTrainer = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, name, photo_url, bio, specialisations, instagram_url")
    .eq("booking_slug", slug)
    .single()
  return data
})

export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { slug } = await params
  const trainer = await getTrainer(slug)
  const trainerName = trainer?.name || "a trainer"
  const trainerBio = trainer?.bio || `Book your personal training session with ${trainerName}`

  return {
    title: `Book a session with ${trainerName}`,
    description: trainerBio,
    openGraph: {
      title: `Book a session with ${trainerName}`,
      description: trainerBio,
    },
  }
}

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { slug } = await params
  const trainer = await getTrainer(slug)

  if (!trainer) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Trainer not found</h1>
          <p className="text-muted-foreground mt-2">
            This booking link doesn&apos;t seem to be active.
          </p>
        </div>
      </div>
    )
  }

  const initials = trainer.name
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Trainer header */}
        <div className="text-center space-y-3">
          {/* Photo or initials */}
          {trainer.photo_url ? (
            <img
              src={trainer.photo_url}
              alt={trainer.name}
              className="mx-auto h-20 w-20 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="bg-primary text-primary-foreground mx-auto flex h-20 w-20
              items-center justify-center rounded-full text-2xl font-bold">
              {initials}
            </div>
          )}

          {/* Name + Instagram */}
          <div>
            <h1 className="text-xl font-bold">{trainer.name}</h1>
            {trainer.instagram_url && (
              <a
                href={trainer.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-xs
                  text-muted-foreground hover:text-primary transition-colors"
                aria-label={`${trainer.name} on Instagram`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                </svg>
                Instagram
              </a>
            )}
          </div>

          {/* Bio */}
          {trainer.bio && (
            <p className="text-muted-foreground text-sm">{trainer.bio}</p>
          )}

          {/* Specialisation badges */}
          {trainer.specialisations && trainer.specialisations.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {trainer.specialisations.map((s: string) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Booking form */}
        <BookingForm trainerId={trainer.id} trainerName={trainer.name} />

        <p className="text-muted-foreground text-center text-xs">
          Powered by FitDesk
        </p>
      </div>
    </div>
  )
}
