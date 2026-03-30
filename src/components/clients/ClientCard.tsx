"use client"

import { useRouter } from "next/navigation"
import type { Client } from "@/types/database"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

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

  return (
    <div
      className="hover:bg-accent flex cursor-pointer items-center gap-3 border-b px-1 py-3 transition-colors"
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {client.first_name} {client.last_name}
        </p>
        <p className="text-muted-foreground text-xs truncate">{client.whatsapp_number}</p>
      </div>
      <Badge variant="secondary" className={statusStyles[client.status]}>
        {client.status}
      </Badge>
    </div>
  )
}
