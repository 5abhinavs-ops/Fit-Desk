"use client"

import { useState, useMemo } from "react"
import { useClients } from "@/hooks/useClients"
import { ClientCard } from "@/components/clients/ClientCard"
import { AddClientSheet } from "@/components/clients/AddClientSheet"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus } from "lucide-react"
import type { ClientStatus } from "@/types/database"

const statusFilters: Array<{ label: string; value: ClientStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Paused", value: "paused" },
  { label: "Inactive", value: "inactive" },
]

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all")
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) => {
      const matchesSearch =
        search === "" ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Badge variant="secondary">{clients?.length ?? 0}</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search clients..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className="shrink-0"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Client list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        clients?.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="space-y-1">
              <p className="text-sm font-medium">No clients yet</p>
              <p className="text-muted-foreground text-xs">Add your first client to get started.</p>
            </div>
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first client
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No clients match your search.
          </p>
        )
      ) : (
        <div>
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      {/* FAB */}
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setSheetOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddClientSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}
