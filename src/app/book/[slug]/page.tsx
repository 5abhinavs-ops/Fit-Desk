import { cache } from "react"
import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { MapPin } from "lucide-react"
import { Icon } from "@/components/ui/icon"
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
          <h1 className="text-2xl font-semibold">Trainer not found</h1>
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

  const firstName = trainer.name.split(" ").filter(Boolean)[0] ?? trainer.name

  const testimonials = [
    trainer.testimonial_1,
    trainer.testimonial_2,
    trainer.testimonial_3,
  ].filter((t): t is string => !!t && t.trim().length > 0)

  const hasPrice = !!trainer.pricing_from
  const hasCancellationPolicy = trainer.cancellation_policy_hours > 0
  const showPriceStrip = hasPrice || hasCancellationPolicy

  const hasTrustBlock =
    !!trainer.bio ||
    !!trainer.why_train_with_me ||
    testimonials.length > 0

  // Cap specialisations at 4 visible badges; real seeded data has ≤4 today.
  // If this ever overflows in production, revisit with a +N overflow chip.
  const badges = trainer.specialisations.slice(0, 4)

  const bookingLocationSummary =
    trainer.training_locations && trainer.training_locations.length > 0
      ? trainer.training_locations.join(" · ")
      : null

  return (
    <div className="flex min-h-screen items-start justify-center p-4 pt-8">
      <div className="w-full max-w-sm space-y-6">
        {/* ================================================================ */}
        {/* BLOCK A — Trainer anchor (above-the-fold)                        */}
        {/* ================================================================ */}
        <div className="text-center space-y-3">
          {trainer.photo_url && trainer.photo_url.startsWith("https://") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trainer.photo_url}
              alt={trainer.name}
              className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="bg-primary text-primary-foreground mx-auto flex h-24 w-24
              items-center justify-center rounded-full text-2xl font-semibold">
              {initials}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold">{trainer.name}</h1>
            {trainer.booking_headline && (
              <p className="text-muted-foreground text-body-sm mt-1">
                {trainer.booking_headline}
              </p>
            )}
            {trainer.instagram_url && trainer.instagram_url.startsWith("https://") && (
              <a
                href={trainer.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-micro
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

          {/* Price strip — graceful collapse per approved ruling 3. */}
          {showPriceStrip && (
            <p className="text-body-sm">
              {hasPrice && (
                <span className="font-semibold">From ${trainer.pricing_from}</span>
              )}
              {hasPrice && hasCancellationPolicy && (
                <span className="text-muted-foreground"> · </span>
              )}
              {hasCancellationPolicy && (
                <span className="text-muted-foreground">
                  {trainer.cancellation_policy_hours}h cancellation
                </span>
              )}
            </p>
          )}

          {/* Quick badges — specialisations, capped at 4. */}
          {badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {badges.map((s: string) => (
                <Badge key={s} variant="secondary" className="text-micro">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {/* Locations — one-line inline with MapPin. */}
          {trainer.training_locations && trainer.training_locations.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-body-sm text-muted-foreground">
              <Icon name={MapPin} size="sm" className="size-3.5" />
              <span>{trainer.training_locations.join(" · ")}</span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* BLOCK B — Form with anchor heading                                */}
        {/* ================================================================ */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Book a session</h2>
          <ErrorBoundary>
            <BookingForm
              trainerId={trainer.id}
              trainerName={trainer.name}
              locationSummary={bookingLocationSummary}
            />
          </ErrorBoundary>
        </div>

        {/* ================================================================ */}
        {/* BLOCK C — Below-the-fold trust (collapses when all fields empty) */}
        {/* ================================================================ */}
        {hasTrustBlock && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Why train with {firstName}
            </h2>

            {trainer.bio && (
              <p className="text-body-sm text-muted-foreground whitespace-pre-line">
                {trainer.bio}
              </p>
            )}

            {trainer.why_train_with_me && (
              <p className="text-body-sm text-muted-foreground whitespace-pre-line">
                {trainer.why_train_with_me}
              </p>
            )}

            {testimonials.length > 0 && (
              <div className="space-y-3">
                {testimonials.map((t, i) => (
                  <div key={i} className="rounded-xl border bg-muted p-4">
                    <span className="text-3xl text-muted-foreground font-serif leading-none">&ldquo;</span>
                    <p className="text-body-sm italic mt-1">{t}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <a
          href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-micro text-muted-foreground hover:text-primary transition-colors"
        >
          Powered by <span className="font-semibold">FitDesk</span>
        </a>
      </div>
    </div>
  )
}
