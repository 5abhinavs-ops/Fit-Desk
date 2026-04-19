"use client"

import { useRouter } from "next/navigation"
import type { Client } from "@/types/database"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { handleKeyboardActivation } from "@/lib/a11y"

interface ClientCardProps {
  client: Client
}

const statusStyles: Record<string, string> = {
  active: "badge-success",
  paused: "badge-warning",
  inactive: "badge-neutral",
}

export function ClientCard({ client }: ClientCardProps) {
  const router = useRouter()
  const initials = `${client.first_name[0] ?? ""}${client.last_name[0] ?? ""}`.toUpperCase()
  const navigate = () => router.push(`/clients/${client.id}`)

  return (
    <div
      role="button"
      tabIndex={0}
      className="hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C6D4] rounded-md flex cursor-pointer items-center gap-3 border-b px-1 py-3 transition-colors"
      onClick={navigate}
      onKeyDown={handleKeyboardActivation(navigate)}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold truncate">
          {client.first_name} {client.last_name}
        </p>
        <p className="text-muted-foreground text-body-sm truncate">{client.whatsapp_number}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant="secondary" className={statusStyles[client.status]}>
          {client.status}
        </Badge>
        {client.whatsapp_opted_out && (
          <Badge
            variant="secondary"
            className="badge-warning text-micro"
            aria-label="WhatsApp reminders are paused for this client"
          >
            Reminders paused
          </Badge>
        )}
      </div>
    </div>
  )
}
