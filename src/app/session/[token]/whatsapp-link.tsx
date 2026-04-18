"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { Icon } from "@/components/ui/icon"

interface WhatsAppLinkProps {
  trainerName: string
  trainerPhone: string
  sessionDate: string
  sessionTime: string
}

export function WhatsAppLink({ trainerName, trainerPhone, sessionDate, sessionTime }: WhatsAppLinkProps) {
  const cleanNumber = trainerPhone.replace(/^[+0]+/, "")
  const message = encodeURIComponent(
    `Hi ${trainerName}, I wanted to reach out about my session on ${sessionDate} at ${sessionTime}.`,
  )
  const href = `https://wa.me/${cleanNumber}?text=${message}`

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" className="w-full gap-2">
        <Icon name={MessageCircle} size="sm" />
        Message {trainerName.split(" ")[0]} on WhatsApp
      </Button>
    </a>
  )
}
