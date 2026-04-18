"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, CheckCircle } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { toast } from "sonner"

interface PaymentProofSheetProps {
  paymentId: string
  trainerId: string
  clientId: string
  clientName: string
  amount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PaymentProofSheet({
  paymentId,
  trainerId,
  clientId,
  clientName,
  amount,
  open,
  onOpenChange,
  onSuccess,
}: PaymentProofSheetProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function handleSubmit() {
    if (!file) return
    setLoading(true)

    try {
      const supabase = createClient()
      const path = `${trainerId}/${clientId}/${paymentId}/${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file)

      if (uploadError) throw uploadError

      // Update payment record — client_confirmed, NOT received (PT must confirm)
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          proof_url: path,
          proof_uploaded_at: new Date().toISOString(),
        })
        .eq("id", paymentId)

      if (updateError) throw updateError

      // Notify PT (amount + name fetched from DB server-side)
      await fetch("/api/client/notify-payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      })

      toast.success("Payment proof submitted")
      setFile(null)
      setPreview(null)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Confirm your payment</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            For your trainer&apos;s convenience, please upload your payment
            screenshot.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Payment proof preview"
                className="w-full max-h-[300px] object-contain rounded-lg border"
              />
              <button
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 text-xs"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              className="w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              {/* 32px glyph inside large dashed dropzone — above lg (24px) */}
              <Icon name={Camera} size="lg" className="size-8" />
              <span className="text-sm">Tap to upload</span>
            </button>
          )}

          <Button
            className="btn-gradient w-full"
            disabled={!file || loading}
            onClick={handleSubmit}
          >
            {loading ? (
              <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />
            ) : (
              <Icon name={CheckCircle} size="sm" className="mr-2" />
            )}
            Submit payment confirmation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
