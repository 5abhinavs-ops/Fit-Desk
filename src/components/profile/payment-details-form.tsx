"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface PaymentDetailsFormProps {
  profileId: string
  initialPaynowNumber: string
  initialBankName: string
  initialBankAccountNumber: string
  initialBankAccountName: string
  initialPaymentLink: string
  initialReminderDays: number
}

export function PaymentDetailsForm({
  profileId,
  initialPaynowNumber,
  initialBankName,
  initialBankAccountNumber,
  initialBankAccountName,
  initialPaymentLink,
  initialReminderDays,
}: PaymentDetailsFormProps) {
  const [saving, setSaving] = useState(false)
  const [paynowNumber, setPaynowNumber] = useState(initialPaynowNumber)
  const [bankName, setBankName] = useState(initialBankName)
  const [bankAccountNumber, setBankAccountNumber] = useState(initialBankAccountNumber)
  const [bankAccountName, setBankAccountName] = useState(initialBankAccountName)
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink)
  const [reminderDays, setReminderDays] = useState(String(initialReminderDays))

  async function handleSave() {
    // Validate payment link if provided
    if (paymentLink && !paymentLink.startsWith("https://")) {
      toast.error("Payment link must start with https://")
      return
    }

    const parsedDays = parseInt(reminderDays, 10)
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 30) {
      toast.error("Reminder frequency must be between 1 and 30 days")
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("profiles")
      .update({
        paynow_number: paynowNumber || null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_name: bankAccountName || null,
        payment_link: paymentLink || null,
        payment_reminder_default_days: parsedDays,
      })
      .eq("id", profileId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Payment details saved")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="paynowNumber">PayNow number</Label>
        <Input
          id="paynowNumber"
          placeholder="+65 9123 4567"
          value={paynowNumber}
          onChange={(e) => setPaynowNumber(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankName">Bank name</Label>
        <Input
          id="bankName"
          placeholder="DBS / POSB / OCBC / UOB"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccNum">Bank account number</Label>
        <Input
          id="bankAccNum"
          placeholder="123-456789-0"
          value={bankAccountNumber}
          onChange={(e) => setBankAccountNumber(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccName">Bank account name</Label>
        <Input
          id="bankAccName"
          placeholder="Your name as on bank account"
          value={bankAccountName}
          onChange={(e) => setBankAccountName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentLink">Payment link</Label>
        <Input
          id="paymentLink"
          placeholder="https://..."
          value={paymentLink}
          onChange={(e) => setPaymentLink(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Optional link to a payment page (e.g. PayNow QR, Stripe link)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminderDays">Payment reminder frequency (days)</Label>
        <Input
          id="reminderDays"
          type="number"
          min="1"
          max="30"
          value={reminderDays}
          onChange={(e) => setReminderDays(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Send payment reminders every {reminderDays || "3"} days until payment is confirmed
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save payment details
      </Button>
    </div>
  )
}
