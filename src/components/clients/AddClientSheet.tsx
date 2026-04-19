"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useClients, useCreateClient } from "@/hooks/useClients"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"

interface AddClientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientSheet({ open, onOpenChange }: AddClientSheetProps) {
  const router = useRouter()
  const { data: clients } = useClients()
  const createClient_ = useCreateClient()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [email, setEmail] = useState("")
  const [goals, setGoals] = useState("")
  const [injuries, setInjuries] = useState("")
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free")
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setSubscriptionPlan(data.subscription_plan)
          })
      }
    })
  }, [])

  function resetForm() {
    setFirstName("")
    setLastName("")
    setWhatsappNumber("")
    setEmail("")
    setGoals("")
    setInjuries("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const existingCount = clients?.length ?? 0
    if (subscriptionPlan === "free" && existingCount >= 3) {
      onOpenChange(false)
      setShowUpgrade(true)
      return
    }

    createClient_.mutate(
      {
        first_name: firstName,
        last_name: lastName,
        whatsapp_number: whatsappNumber,
        email: email || null,
        goals: goals || null,
        injuries_medical: injuries || null,
        photo_url: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        status: "active",
        whatsapp_opted_out: false,
      },
      {
        onSuccess: () => {
          toast.success("Client added")
          resetForm()
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to add client")
        },
      }
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add client</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp number *</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+65 9123 4567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                onBlur={(e) => setWhatsappNumber(formatWhatsappNumber(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                placeholder="Weight loss, muscle building..."
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="injuries">Injuries / Medical notes</Label>
              <Textarea
                id="injuries"
                placeholder="Bad knees, lower back pain..."
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2 sticky bottom-0 bg-background pb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createClient_.isPending}>
                {createClient_.isPending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
                Add client
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              You&apos;ve reached the 3-client limit on the free plan. Upgrade to Pro for unlimited
              clients, WhatsApp reminders, and full payment tracking — $19/month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Not now
            </Button>
            <Button onClick={() => router.push("/upgrade")}>Upgrade to Pro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
