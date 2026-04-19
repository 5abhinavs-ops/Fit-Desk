"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useClients, useCreateClient } from "@/hooks/useClients"
import { useCreatePackage } from "@/hooks/usePackages"
import { useCreatePayment } from "@/hooks/usePayments"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { formatWhatsappNumber } from "@/lib/formatWhatsapp"
import type { PaymentMethod } from "@/types/database"

interface AddClientWithPackageSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "PayNow", label: "PayNow" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
]

export function AddClientWithPackageSheet({
  open,
  onOpenChange,
}: AddClientWithPackageSheetProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: clients } = useClients()
  const createClient_ = useCreateClient()
  const createPackage = useCreatePackage()
  const createPayment = useCreatePayment()

  // Client fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [email, setEmail] = useState("")
  const [goals, setGoals] = useState("")
  const [injuries, setInjuries] = useState("")

  // Package toggle + fields
  const [showPackage, setShowPackage] = useState(false)
  const [pkgName, setPkgName] = useState("")
  const [totalSessions, setTotalSessions] = useState("10")
  const [price, setPrice] = useState("")
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0],
  )
  const [expiryDate, setExpiryDate] = useState("")

  // Payment fields
  const [amountPaid, setAmountPaid] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PayNow")

  // Meta
  const [subscriptionPlan, setSubscriptionPlan] = useState("free")
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const packagePrice = parseFloat(price) || 0
  const showPaymentSection = showPackage && packagePrice > 0

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
    setShowPackage(false)
    setPkgName("")
    setTotalSessions("10")
    setPrice("")
    setStartDate(new Date().toISOString().split("T")[0])
    setExpiryDate("")
    setAmountPaid("")
    setPaymentMethod("PayNow")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const existingCount = clients?.length ?? 0
    if (subscriptionPlan === "free" && existingCount >= 3) {
      onOpenChange(false)
      setShowUpgrade(true)
      return
    }

    setIsSubmitting(true)

    try {
      // Step 1: Create client
      const newClient = await createClient_.mutateAsync({
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
      })

      // Step 2: Create package (if toggled on and filled)
      let newPackage: { id: string } | null = null
      if (showPackage && pkgName && price) {
        newPackage = await createPackage.mutateAsync({
          client_id: newClient.id,
          name: pkgName,
          total_sessions: parseInt(totalSessions, 10),
          price: packagePrice,
          start_date: startDate,
          expiry_date: expiryDate || null,
        })
      }

      // Step 3: Create payment record(s)
      if (newPackage && packagePrice > 0) {
        const today = new Date().toISOString().split("T")[0]
        const paid = parseFloat(amountPaid) || 0
        const basePayment = {
          client_id: newClient.id,
          package_id: newPackage.id,
          booking_id: null,
          method: paymentMethod,
          reference: null,
          notes: null,
          due_date: today,
          received_date: null as string | null,
        }

        if (paid <= 0) {
          await createPayment.mutateAsync({
            ...basePayment,
            amount: packagePrice,
            status: "pending",
          })
        } else if (paid < packagePrice) {
          await createPayment.mutateAsync({
            ...basePayment,
            amount: paid,
            status: "received",
            received_date: today,
          })
          await createPayment.mutateAsync({
            ...basePayment,
            amount: packagePrice - paid,
            status: "pending",
            reference: null,
          })
        } else {
          await createPayment.mutateAsync({
            ...basePayment,
            amount: packagePrice,
            status: "received",
            due_date: null,
            received_date: today,
          })
        }
      }

      // Step 4: Invalidate all affected queries
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      queryClient.invalidateQueries({ queryKey: ["packages"] })
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })

      toast.success(showPackage ? "Client and package added" : "Client added")
      resetForm()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add client</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Section 1: Client fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ac-firstName">First name *</Label>
                <Input
                  id="ac-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ac-lastName">Last name *</Label>
                <Input
                  id="ac-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ac-whatsapp">WhatsApp number *</Label>
              <Input
                id="ac-whatsapp"
                type="tel"
                placeholder="+65 9123 4567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                onBlur={(e) =>
                  setWhatsappNumber(formatWhatsappNumber(e.target.value))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ac-email">Email</Label>
              <Input
                id="ac-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ac-goals">Goals</Label>
              <Textarea
                id="ac-goals"
                placeholder="Weight loss, muscle building..."
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ac-injuries">Injuries / Medical notes</Label>
              <Textarea
                id="ac-injuries"
                placeholder="Bad knees, lower back pain..."
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
              />
            </div>

            {/* Section 2: Package (toggle) */}
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="ac-pkg-toggle">Add a package</Label>
              <Switch
                id="ac-pkg-toggle"
                checked={showPackage}
                onCheckedChange={(v) => setShowPackage(v)}
              />
            </div>

            {showPackage && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ac-pkgName">Package name *</Label>
                  <Input
                    id="ac-pkgName"
                    placeholder="10-session PT pack"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ac-sessions">Total sessions *</Label>
                    <Input
                      id="ac-sessions"
                      type="number"
                      min={1}
                      value={totalSessions}
                      onChange={(e) => setTotalSessions(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ac-price">Price ($) *</Label>
                    <Input
                      id="ac-price"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="600"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ac-startDate">Start date *</Label>
                    <Input
                      id="ac-startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ac-expiryDate">Expiry date</Label>
                    <Input
                      id="ac-expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section 3: Payment (auto-shown when price > 0) */}
                {showPaymentSection && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="ac-amountPaid">Amount paid now ($)</Label>
                        <Input
                          id="ac-amountPaid"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                          Leave blank or 0 if client hasn&apos;t paid yet —
                          full amount will appear as due.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment method</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(val) => {
                            if (val) setPaymentMethod(val as PaymentMethod)
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Submit bar */}
            <div className="bg-background sticky bottom-0 flex gap-3 pt-2 pb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && (
                  <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />
                )}
                {showPackage ? "Add client + package" : "Add client"}
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
              You&apos;ve reached the 3-client limit on the free plan. Upgrade
              to Pro for unlimited clients, WhatsApp reminders, and full payment
              tracking — $19/month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>
              Not now
            </Button>
            <Button onClick={() => router.push("/upgrade")}>
              Upgrade to Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
