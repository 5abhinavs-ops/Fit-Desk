"use client"

import { useState } from "react"
import { useClients } from "@/hooks/useClients"
import { useCreatePayment } from "@/hooks/usePayments"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { PaymentMethod } from "@/types/database"

interface LogPaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogPaymentSheet({ open, onOpenChange }: LogPaymentSheetProps) {
  const { data: clients } = useClients()
  const createPayment = useCreatePayment()
  const [clientId, setClientId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("PayNow")
  const [reference, setReference] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      toast.error("Please select a client")
      return
    }

    createPayment.mutate(
      {
        client_id: clientId,
        package_id: null,
        booking_id: null,
        amount: parseFloat(amount),
        method,
        status: dueDate ? "pending" : "received",
        due_date: dueDate || null,
        received_date: dueDate ? null : new Date().toISOString().split("T")[0],
        reference: reference || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Payment logged")
          setClientId("")
          setAmount("")
          setMethod("PayNow")
          setReference("")
          setDueDate("")
          setNotes("")
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to log payment")
        },
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log payment</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod((v ?? "PayNow") as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PayNow">PayNow</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ref">Reference</Label>
            <Input
              id="ref"
              placeholder="PayNow ref: abc123 or bank ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Leave blank if paying now</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payNotes">Notes</Label>
            <Textarea
              id="payNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createPayment.isPending}>
            {createPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log payment
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
