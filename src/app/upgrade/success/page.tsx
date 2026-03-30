"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const unlocked = [
  "Unlimited clients",
  "WhatsApp reminders",
  "Automated payment chasers",
  "Public booking link",
]

export default function UpgradeSuccessPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">You&apos;re on Pro!</h1>

        <ul className="space-y-2 text-left">
          {unlocked.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <Check className="text-green-600 h-4 w-4 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Button className="w-full" onClick={() => router.push("/")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
