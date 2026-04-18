"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Check } from "lucide-react"
import { Icon } from "@/components/ui/icon"

const benefits = [
  "Unlimited clients",
  "WhatsApp session reminders (24h + 1h)",
  "Automated payment chasers (day 1, 3, 7)",
  "Cash, PayNow, bank transfer tracking",
  "Package session countdown",
  "Public booking link for clients",
  "Client self-booking page",
]

export default function UpgradePage() {
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Upgrade to FitDesk Pro</h1>
        </div>

        {/* Pricing toggle */}
        <div className="flex justify-center gap-2">
          <Button
            variant={interval === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("month")}
          >
            Monthly
          </Button>
          <Button
            variant={interval === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => setInterval("year")}
          >
            Annual
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            {interval === "month" ? (
              <p className="text-3xl font-semibold">
                $19<span className="text-muted-foreground text-base font-normal">/month</span>
              </p>
            ) : (
              <div>
                <p className="text-3xl font-semibold">
                  $190<span className="text-muted-foreground text-base font-normal">/year</span>
                </p>
                <p className="text-muted-foreground text-sm mt-1">Save 2 months</p>
              </div>
            )}
          </CardContent>
        </Card>

        <ul className="space-y-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <Icon name={Check} size="sm" className="text-green-600 mt-0.5 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <Button className="w-full" onClick={handleUpgrade} disabled={loading}>
          {loading && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
          Upgrade now
        </Button>
      </div>
    </div>
  )
}
