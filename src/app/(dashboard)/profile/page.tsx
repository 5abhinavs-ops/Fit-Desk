"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { LogOut, ChevronDown, ChevronUp, Salad, BarChart2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import type { Profile } from "@/types/database"
import { ProfilePhotoUpload } from "@/components/profile/profile-photo-upload"
import { ProfileDetailsForm } from "@/components/profile/profile-details-form"
import { BookingSettingsForm } from "@/components/profile/booking-settings-form"
import { CancellationPolicyForm } from "@/components/profile/cancellation-policy-form"
import { PaymentDetailsForm } from "@/components/profile/payment-details-form"
import { AvailabilitySettings } from "@/components/profile/availability-settings"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        if (data) {
          setProfile(data as Profile)
        }
      } catch {
        toast.error("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  async function handleManageSubscription() {
    try {
      const res = await fetch("/api/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to open billing portal")
      }
    } catch {
      toast.error("Failed to open billing portal")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-muted-foreground">Profile not found</p>
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Quick links — Nutrition & Analytics */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push("/nutrition")}
          className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent transition-colors">
          <Icon name={Salad} size="md" className="text-[#84CC16]" />
          <span className="text-sm font-semibold">Nutrition</span>
        </button>
        <button onClick={() => router.push("/analytics")}
          className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent transition-colors">
          <Icon name={BarChart2} size="md" className="text-[#8B5CF6]" />
          <span className="text-sm font-semibold">Analytics</span>
        </button>
      </div>

      {/* Section 1 — Trainer profile */}
      <h2 className="text-lg font-semibold">Your profile</h2>
      <ProfilePhotoUpload
        profileId={profile.id}
        name={profile.name}
        whatsappNumber={profile.whatsapp_number}
        initialPhotoUrl={profile.photo_url}
      />
      <ProfileDetailsForm
        profileId={profile.id}
        initialName={profile.name}
        initialWhatsapp={profile.whatsapp_number}
        initialBio={profile.bio || ""}
        initialSpecialisations={(profile.specialisations || []).join(", ")}
        initialInstagramUrl={profile.instagram_url || ""}
        initialBookingHeadline={profile.booking_headline || ""}
        initialWhyTrainWithMe={profile.why_train_with_me || ""}
        initialPricingFrom={profile.pricing_from ? String(profile.pricing_from) : ""}
        initialTestimonial1={profile.testimonial_1 || ""}
        initialTestimonial2={profile.testimonial_2 || ""}
        initialTestimonial3={profile.testimonial_3 || ""}
      />

      <Separator />

      {/* Section 2 — Booking settings */}
      <h2 className="text-lg font-semibold">Your booking link</h2>
      <BookingSettingsForm
        profileId={profile.id}
        initialSlug={profile.booking_slug}
        initialSessionMins={profile.default_session_mins}
        initialPaymentMode={profile.default_booking_payment_mode}
        initialPaynowDetails={profile.paynow_details || ""}
        initialTrainingLocations={profile.training_locations || []}
      />

      <Separator />

      {/* Section 3 — Cancellation & Approval Policy */}
      <h2 className="text-lg font-semibold">Cancellation policy</h2>
      <CancellationPolicyForm
        profileId={profile.id}
        initialPolicyHours={profile.cancellation_policy_hours}
        initialApprovalRequired={profile.booking_approval_required}
      />

      <Separator />

      {/* Section 4 — Payment details */}
      <h2 className="text-lg font-semibold">Payment details</h2>
      <PaymentDetailsForm
        profileId={profile.id}
        initialPaynowNumber={profile.paynow_number || ""}
        initialBankName={profile.bank_name || ""}
        initialBankAccountNumber={profile.bank_account_number || ""}
        initialBankAccountName={profile.bank_account_name || ""}
        initialPaymentLink={profile.payment_link || ""}
        initialReminderDays={profile.payment_reminder_default_days}
        showAdvanced={showAdvancedPayment}
      />
      <Button
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => setShowAdvancedPayment(!showAdvancedPayment)}
      >
        {/* 12px chevron in size="sm" toggle */}
        {showAdvancedPayment
          ? <Icon name={ChevronUp} size="sm" className="size-3 mr-1" />
          : <Icon name={ChevronDown} size="sm" className="size-3 mr-1" />}
        {showAdvancedPayment ? "Hide advanced settings" : "Show advanced payment settings"}
      </Button>

      <Separator />

      {/* Section 5 — Availability */}
      <h2 id="availability" className="scroll-mt-4 text-lg font-semibold">Availability</h2>
      <AvailabilitySettings />

      <Separator />

      {/* Section 6 — Subscription */}
      <h2 className="text-lg font-semibold">Subscription</h2>
      <Card>
        <CardContent className="p-4 space-y-3">
          {profile.subscription_plan === "pro" ? (
            <>
              <Badge className="bg-[rgba(0,224,150,0.15)] text-[#00E096]">Pro</Badge>
              <p className="text-sm">Unlimited clients. All features active.</p>
              <Button variant="outline" onClick={handleManageSubscription}>
                Manage subscription
              </Button>
            </>
          ) : (
            <>
              <Badge variant="secondary">Free plan</Badge>
              <p className="text-sm">3 clients maximum. Upgrade for unlimited.</p>
              <Button onClick={() => router.push("/upgrade")}>
                Upgrade to Pro — $19/month
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Section 4 — Account */}
      <h2 className="text-lg font-semibold">Account</h2>
      <div className="space-y-3">
        <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleSignOut}>
          <Icon name={LogOut} size="sm" className="mr-2" />
          Sign out
        </Button>
        <p className="text-muted-foreground text-xs">v1.0.0</p>
      </div>
    </div>
  )
}
