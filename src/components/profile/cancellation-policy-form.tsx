"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CancellationPolicyFormProps {
  profileId: string
  initialPolicyHours: number
  initialApprovalRequired: boolean
}

export function CancellationPolicyForm({
  profileId,
  initialPolicyHours,
  initialApprovalRequired,
}: CancellationPolicyFormProps) {
  const [saving, setSaving] = useState(false)
  const [policyHours, setPolicyHours] = useState(String(initialPolicyHours))
  const [approvalRequired, setApprovalRequired] = useState(initialApprovalRequired)

  async function handleSave() {
    const parsed = parseInt(policyHours, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Please enter a valid number of hours")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        cancellation_policy_hours: parsed,
        booking_approval_required: approvalRequired,
      })
      .eq("id", profileId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Policy settings saved")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Cancellation window */}
      <div className="space-y-2">
        <Label htmlFor="policyHours">Free cancellation window (hours)</Label>
        <Input
          id="policyHours"
          type="number"
          min="0"
          max="168"
          value={policyHours}
          onChange={(e) => setPolicyHours(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Clients can cancel for free up to {policyHours || "0"} hours before their session.
          Later cancellations forfeit the session.
        </p>
      </div>

      {/* Booking approval toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="approvalToggle" className="text-sm font-medium">
            Require approval for new bookings
          </Label>
          <p className="text-muted-foreground text-xs">
            New booking requests from the public page will need your approval before being confirmed.
          </p>
        </div>
        <Switch
          id="approvalToggle"
          checked={approvalRequired}
          onCheckedChange={setApprovalRequired}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save policy settings
      </Button>
    </div>
  )
}
