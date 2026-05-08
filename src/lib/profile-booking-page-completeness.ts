import type { Profile } from "@/types/database"

export type BookingPageCompletenessKey =
  | "photo"
  | "bio"
  | "specialisations"
  | "training_locations"
  | "pricing_from"
  | "testimonial_1"

export type BookingPageFieldAction = "focus" | "openPhotoPicker"

export interface BookingPageCompletenessItem {
  key: BookingPageCompletenessKey
  label: string
  done: boolean
  scrollTargetId: string
  /** Element id to focus after scroll; defaults to scrollTargetId */
  focusElementId?: string
  action: BookingPageFieldAction
}

const TOTAL_FIELDS = 6

export function getBookingPageCompleteness(profile: Profile): {
  percent: number
  filledCount: number
  items: BookingPageCompletenessItem[]
  missing: BookingPageCompletenessItem[]
} {
  const hasPhoto = !!(profile.photo_url && String(profile.photo_url).trim())
  const hasBio = !!(profile.bio && profile.bio.trim())
  const hasSpecs =
    Array.isArray(profile.specialisations) && profile.specialisations.length > 0
  const hasLocations =
    Array.isArray(profile.training_locations) && profile.training_locations.length > 0
  const hasPricing = profile.pricing_from != null && !Number.isNaN(profile.pricing_from)
  const hasTestimonial1 = !!(profile.testimonial_1 && profile.testimonial_1.trim())

  const items: BookingPageCompletenessItem[] = [
    {
      key: "photo",
      label: "Profile picture",
      done: hasPhoto,
      scrollTargetId: "profile-field-photo",
      focusElementId: "profile-photo-input",
      action: "openPhotoPicker",
    },
    {
      key: "bio",
      label: "Bio",
      done: hasBio,
      scrollTargetId: "profile-field-bio",
      focusElementId: "profileBio",
      action: "focus",
    },
    {
      key: "specialisations",
      label: "Specialisations",
      done: hasSpecs,
      scrollTargetId: "profile-field-specialisations",
      focusElementId: "profileSpecs",
      action: "focus",
    },
    {
      key: "training_locations",
      label: "Training locations",
      done: hasLocations,
      scrollTargetId: "profile-field-training-locations",
      focusElementId: "locations",
      action: "focus",
    },
    {
      key: "pricing_from",
      label: "Price per session",
      done: hasPricing,
      scrollTargetId: "profile-field-pricing",
      focusElementId: "pricingFrom",
      action: "focus",
    },
    {
      key: "testimonial_1",
      label: "Testimonial",
      done: hasTestimonial1,
      scrollTargetId: "profile-field-testimonial-1",
      focusElementId: "testimonial1",
      action: "focus",
    },
  ]

  const filledCount = items.filter((i) => i.done).length
  const percent = Math.round((filledCount / TOTAL_FIELDS) * 100)
  const missing = items.filter((i) => !i.done)

  return { percent, filledCount, items, missing }
}
