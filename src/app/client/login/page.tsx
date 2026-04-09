"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function ClientLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const sendOtp = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/client-auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: whatsappNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setStep(2)
      setResendTimer(60)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }, [whatsappNumber])

  async function handleVerify() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/client-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: whatsappNumber, otp }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid code")
        return
      }

      // Set session
      const supabase = createClient()
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      toast.success(`Welcome, ${data.client.first_name}!`)
      router.push("/client")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <FitDeskLogo size="lg" />
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-muted-foreground mt-1 text-[15px]">
                Enter your WhatsApp number to sign in
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp number</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+65 9123 4567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-[#FF4C7A]">{error}</p>
            )}

            <Button
              className="btn-gradient w-full"
              onClick={sendOtp}
              disabled={loading || whatsappNumber.length < 8}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Send code
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Check your WhatsApp</h1>
              <p className="text-muted-foreground mt-1 text-[15px]">
                We sent a 6-digit code to {whatsappNumber}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
                disabled={loading}
                className="text-center text-2xl tracking-[0.3em]"
              />
            </div>

            {error && (
              <p className="text-sm text-[#FF4C7A]">{error}</p>
            )}

            <Button
              className="btn-gradient w-full"
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Verify
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setStep(1)
                  setOtp("")
                  setError("")
                }}
              >
                Use a different number
              </button>

              {resendTimer > 0 ? (
                <span className="text-muted-foreground">
                  {resendTimer}s
                </span>
              ) : (
                <button
                  className="text-primary hover:underline"
                  onClick={() => {
                    sendOtp()
                  }}
                  disabled={loading}
                >
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
