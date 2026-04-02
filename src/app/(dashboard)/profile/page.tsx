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
import { LogOut } from "lucide-react"
import type { Profile } from "@/types/database"
import { ProfilePhotoUpload } from "@/components/profile/profile-photo-upload"
import { ProfileDetailsForm } from "@/components/profile/profile-details-form"
import { BookingSettingsForm } from "@/components/profile/booking-settings-form"
import { CancellationPolicyForm } from "@/components/profile/cancellation-policy-form"
import { PaymentDetailsForm } from "@/components/profile/payment-details-form"

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

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
      />

      <Separator />

      {/* Section 5 — Subscription */}
      <h2 className="text-lg font-semibold">Subscription</h2>
      <Card>
        <CardContent className="p-4 space-y-3">
          {profile.subscription_plan === "pro" ? (
            <>
              <Badge className="bg-green-100 text-green-800">Pro</Badge>
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
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        <p className="text-muted-foreground text-xs">v1.0.0</p>
      </div>
    </div>
  )
}
