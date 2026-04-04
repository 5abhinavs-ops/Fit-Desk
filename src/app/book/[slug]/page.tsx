import { cache } from "react"
import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { BookingForm } from "@/components/BookingForm"
import { ErrorBoundary } from "@/components/error-boundary"
import { Badge } from "@/components/ui/badge"

interface BookingPageProps {
  params: Promise<{ slug: string }>
}

const getTrainer = cache(async (slug: string) => {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("profiles")
    .select("id, name, photo_url, bio, specialisations, instagram_url, booking_headline, why_train_with_me, pricing_from, cancellation_policy_hours, testimonial_1, testimonial_2, testimonial_3, training_locations")
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
          {trainer.photo_url && trainer.photo_url.startsWith("https://") ? (
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

          {/* Name + headline + Instagram */}
          <div>
            <h1 className="text-xl font-bold">{trainer.name}</h1>
            {trainer.booking_headline && (
              <p className="text-muted-foreground text-sm mt-1">{trainer.booking_headline}</p>
            )}
            {trainer.instagram_url && trainer.instagram_url.startsWith("https://") && (
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

        {/* Training locations */}
        {trainer.training_locations && trainer.training_locations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="text-xs text-muted-foreground">Training locations</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {trainer.training_locations.map((loc: string) => (
                <Badge key={loc} variant="outline" className="text-xs">{loc}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Why train with me */}
        {trainer.why_train_with_me && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Why train with me</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {trainer.why_train_with_me}
            </p>
          </div>
        )}

        {/* Pricing + cancellation policy */}
        <div className="space-y-1">
          {trainer.pricing_from && (
            <p className="text-sm font-medium">
              Sessions from <span className="text-primary">${trainer.pricing_from}</span>
            </p>
          )}
          {trainer.cancellation_policy_hours > 0 && (
            <p className="text-muted-foreground text-xs">
              {trainer.cancellation_policy_hours} hours cancellation notice required
            </p>
          )}
        </div>

        {/* Testimonials */}
        {(() => {
          const testimonials = [trainer.testimonial_1, trainer.testimonial_2, trainer.testimonial_3]
            .filter((t): t is string => !!t && t.trim().length > 0)
          if (testimonials.length === 0) return null
          return (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-center">What clients say</p>
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-xl border bg-muted p-4">
                  <span className="text-3xl text-muted-foreground font-serif leading-none">&ldquo;</span>
                  <p className="text-sm italic mt-1">{t}</p>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Booking form */}
        <ErrorBoundary>
          <BookingForm trainerId={trainer.id} trainerName={trainer.name} />
        </ErrorBoundary>

        <a
          href="https://fitdesk.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Powered by <span className="font-medium">FitDesk</span>
        </a>
      </div>
    </div>
  )
}
