"use client"

import { useState } from "react"
import { FitDeskLogo } from "@/components/shared/fitdesk-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"

export default function ClientLoginPage() {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.")
        return
      }

      setSubmitted(true)
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

        {!submitted ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold">Login to FitDesk</h1>
              <p className="text-muted-foreground mt-2 text-body-lg">
                Enter your phone number. We&apos;ll send you an SMS with a secure
                login link.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+65 9123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                autoComplete="tel"
              />
            </div>

            {error && (
              <p className="text-sm text-[#FF4C7A]" role="alert">
                {error}
              </p>
            )}

            <Button
              className="btn-gradient w-full"
              onClick={handleSubmit}
              disabled={loading || phone.trim().length < 8}
            >
              {loading ? (
                <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />
              ) : null}
              Send login link
            </Button>

            <p className="text-muted-foreground text-center text-xs">
              No code to type — just tap the link.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Check your phone</h1>
            <p className="text-muted-foreground text-body-lg">
              Check your phone for an SMS. Tap the link to log in instantly.
              (Link expires in 10 minutes)
            </p>
            <p className="text-muted-foreground text-xs">
              No code to type — just tap the link.
            </p>
            <button
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              onClick={() => {
                setSubmitted(false)
                setPhone("")
              }}
            >
              Use a different number
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
