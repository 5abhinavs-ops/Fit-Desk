"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useClient } from "@/hooks/useClients"
import { useQueryClient } from "@tanstack/react-query"
import { usePackages, useLogSession } from "@/hooks/usePackages"
import { CreatePackageSheet } from "@/components/clients/CreatePackageSheet"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, MessageCircle, Mail, Loader2 } from "lucide-react"
import type { ClientStatus } from "@/types/database"

const statusCycle: ClientStatus[] = ["active", "paused", "inactive"]
const statusStyles: Record<string, string> = {
  active: "badge-success",
  paused: "badge-warning",
  inactive: "badge-neutral",
}
const paymentStyles: Record<string, string> = {
  paid: "badge-success",
  partial: "badge-warning",
  unpaid: "badge-danger",
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: client, isLoading: clientLoading } = useClient(id)
  const { data: packages, isLoading: pkgLoading } = usePackages(id)
  const logSession = useLogSession()
  const queryClient = useQueryClient()
  const [pkgSheetOpen, setPkgSheetOpen] = useState(false)
  const [reminderDays, setReminderDays] = useState("")
  const [reminderSaving, setReminderSaving] = useState(false)

  const activePackage = packages?.find((p) => p.status === "active")

  // Init reminder days from client data
  if (client && !reminderDays && client.payment_reminder_days !== null) {
    setReminderDays(String(client.payment_reminder_days))
  }

  async function saveReminderDays() {
    if (!client) return
    const parsed = parseInt(reminderDays, 10)
    if (isNaN(parsed) || parsed < 1) {
      toast.error("Enter a valid number of days")
      return
    }
    setReminderSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("clients")
      .update({ payment_reminder_days: parsed })
      .eq("id", client.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Reminder frequency saved")
      queryClient.invalidateQueries({ queryKey: ["clients", client.id] })
    }
    setReminderSaving(false)
  }

  async function toggleStatus() {
    if (!client) return
    const currentIdx = statusCycle.indexOf(client.status)
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length]
    const supabase = createClient()
    const { error } = await supabase
      .from("clients")
      .update({ status: nextStatus })
      .eq("id", client.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Status changed to ${nextStatus}`)
      queryClient.invalidateQueries({ queryKey: ["clients", client.id] })
      queryClient.invalidateQueries({ queryKey: ["clients"] })
    }
  }

  function handleMarkSession() {
    if (!activePackage) return
    logSession.mutate(activePackage.id, {
      onSuccess: (result) => {
        if (result.sessions_used >= result.total_sessions) {
          toast.success("Package complete — time to renew.", {
            action: {
              label: "Create package",
              onClick: () => setPkgSheetOpen(true),
            },
            duration: 6000,
          })
        } else {
          toast.success("Session logged — 1 session deducted")
        }
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Failed to log session")
      },
    })
  }

  if (clientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!client) {
    return <p className="text-muted-foreground py-12 text-center">Client not found.</p>
  }

  const initials = `${client.first_name[0] ?? ""}${client.last_name[0] ?? ""}`.toUpperCase()
  const sessionsUsed = activePackage?.sessions_used ?? 0
  const totalSessions = activePackage?.total_sessions ?? 0
  const sessionsRemaining = totalSessions - sessionsUsed
  const progressPct = totalSessions > 0 ? (sessionsUsed / totalSessions) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/clients")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Clients
      </Button>

      {/* Hero */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {client.first_name} {client.last_name}
          </h1>
          <Badge
            variant="secondary"
            className={`mt-1 cursor-pointer ${statusStyles[client.status]}`}
            onClick={toggleStatus}
          >
            {client.status}
          </Badge>
        </div>
      </div>

      {/* Contact buttons */}
      <div className="flex gap-3">
        <a
          href={`https://wa.me/${client.whatsapp_number.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-input bg-background hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </a>
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="border-input bg-background hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </a>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Goals:</span>{" "}
          {client.goals || "Not set"}
        </div>
        <div>
          <span className="text-muted-foreground">Injuries / Medical:</span>{" "}
          {client.injuries_medical || "None recorded"}
        </div>
        {client.emergency_contact_name && (
          <div>
            <span className="text-muted-foreground">Emergency:</span>{" "}
            {client.emergency_contact_name} — {client.emergency_contact_phone}
          </div>
        )}
      </div>

      {/* Active package */}
      {pkgLoading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : activePackage ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{activePackage.name}</p>
              <Badge variant="secondary" className={paymentStyles[activePackage.payment_status]}>
                {activePackage.payment_status === "paid"
                  ? "Paid"
                  : activePackage.payment_status === "partial"
                    ? "Partial"
                    : "Unpaid"}
              </Badge>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-muted-foreground text-xs">
              {sessionsUsed} of {totalSessions} sessions used — {sessionsRemaining} remaining
            </p>
            <Button
              className="w-full"
              onClick={handleMarkSession}
              disabled={sessionsUsed >= totalSessions || logSession.isPending}
            >
              {logSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark session done
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-sm">No active package</p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={() => setPkgSheetOpen(true)}>
        Create package
      </Button>

      {/* Payment reminder setting */}
      <div className="rounded-lg border p-4 space-y-2">
        <Label htmlFor="reminderDays" className="text-sm font-medium">Payment reminder frequency</Label>
        <div className="flex gap-2">
          <Input
            id="reminderDays"
            type="number"
            min="1"
            max="30"
            placeholder="3"
            value={reminderDays}
            onChange={(e) => setReminderDays(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground self-center">days</span>
          <Button
            size="sm"
            variant="outline"
            onClick={saveReminderDays}
            disabled={reminderSaving}
          >
            {reminderSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Auto-send payment reminders every {reminderDays || "—"} days
        </p>
      </div>

      <CreatePackageSheet clientId={id} open={pkgSheetOpen} onOpenChange={setPkgSheetOpen} />
    </div>
  )
}
