"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useClient } from "@/hooks/useClients"
import { useQueryClient } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { usePackages, useLogSession } from "@/hooks/usePackages"
import { useRecurringSchedules, useCreateRecurringSchedule, useDeleteRecurringSchedule } from "@/hooks/useRecurringSchedules"
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
import { NutritionTab } from "@/components/clients/nutrition-tab"
import { ClientPaymentsTab } from "@/components/clients/ClientPaymentsTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MessageCircle, Mail, Loader2, FileText, Salad, ChevronDown, ChevronUp, Trash2, RefreshCw } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { format } from "date-fns"
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
  const [nutritionExpanded, setNutritionExpanded] = useState(false)
  const [recurringExpanded, setRecurringExpanded] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurDow, setRecurDow] = useState("1")
  const [recurTime, setRecurTime] = useState("09:00")
  const [recurDuration, setRecurDuration] = useState("60")
  const [recurPackageId, setRecurPackageId] = useState("")

  const { data: recurringSchedules } = useRecurringSchedules(id)
  const createRecurring = useCreateRecurringSchedule()
  const deleteRecurring = useDeleteRecurringSchedule()

  const supabase = createClient()
  const { data: recentNotes } = useQuery({
    queryKey: ["client-notes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, date_time, session_notes")
        .eq("client_id", id)
        .not("session_notes", "is", null)
        .order("date_time", { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  const activePackage = packages?.find((p) => p.status === "active")

  // Init reminder days from client data
  /* eslint-disable react-hooks/set-state-in-effect -- syncing form state with async query result, intentional */
  useEffect(() => {
    if (client && client.payment_reminder_days !== null) {
      setReminderDays(String(client.payment_reminder_days))
    }
  }, [client])
  /* eslint-enable react-hooks/set-state-in-effect */

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
        <Icon name={ArrowLeft} size="sm" className="mr-1" />
        Clients
      </Button>

      {/* Hero */}
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">
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
          <Icon name={MessageCircle} size="sm" className="mr-2" />
          WhatsApp
        </a>
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            className="border-input bg-background hover:bg-accent inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
          >
            <Icon name={Mail} size="sm" className="mr-2" />
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="payments" className="flex-1">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
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
                  {logSession.isPending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
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

          {/* Recent notes */}
          {recentNotes && recentNotes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Icon name={FileText} size="sm" />
                Recent notes
              </h2>
              {recentNotes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-3">
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(note.date_time), "d MMM yyyy")}
                    </p>
                    <p className="text-sm mt-1">{note.session_notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => setPkgSheetOpen(true)}>
            Create package
          </Button>

          {/* Nutrition — collapsible */}
          <div className="rounded-lg border p-3">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setNutritionExpanded(!nutritionExpanded)}
            >
              <div className="flex items-center gap-1.5">
                <Icon name={Salad} size="sm" className="text-muted-foreground" />
                <span className="text-sm font-semibold">Nutrition</span>
              </div>
              {nutritionExpanded ? (
                <Icon name={ChevronUp} size="sm" className="text-muted-foreground transition-transform" />
              ) : (
                <Icon name={ChevronDown} size="sm" className="text-muted-foreground transition-transform" />
              )}
            </button>
            {nutritionExpanded && (
              <div className="mt-3">
                <NutritionTab clientId={id} />
              </div>
            )}
          </div>

          {/* Recurring sessions — collapsible */}
          <div className="rounded-lg border p-3">
            <button
              className="flex items-center justify-between w-full"
              onClick={() => setRecurringExpanded(!recurringExpanded)}
            >
              <div className="flex items-center gap-1.5">
                <Icon name={RefreshCw} size="sm" className="text-muted-foreground" />
                <span className="text-sm font-semibold">Recurring sessions</span>
              </div>
              {recurringExpanded ? (
                <Icon name={ChevronUp} size="sm" className="text-muted-foreground transition-transform" />
              ) : (
                <Icon name={ChevronDown} size="sm" className="text-muted-foreground transition-transform" />
              )}
            </button>
            {recurringExpanded && (
              <div className="mt-3 space-y-3">
                {recurringSchedules && recurringSchedules.length > 0 ? (
                  <div className="space-y-2">
                    {recurringSchedules.map((sched) => (
                      <div
                        key={sched.id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            Every {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][sched.day_of_week]} at{" "}
                            {(() => {
                              const [hStr, mStr] = sched.start_time.split(":")
                              const h = parseInt(hStr, 10)
                              const ampm = h >= 12 ? "PM" : "AM"
                              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                              return `${h12}:${mStr} ${ampm}`
                            })()}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {sched.duration_mins} min
                            {sched.package_name && ` · ${sched.package_name}`}
                            {sched.sessions_remaining !== null && ` · ${sched.sessions_remaining} left`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500"
                          aria-label="Delete recurring schedule"
                          onClick={() =>
                            deleteRecurring.mutate(
                              { id: sched.id, clientId: id },
                              {
                                onSuccess: () => toast.success("Recurring schedule deactivated"),
                                onError: () => toast.error("Failed to deactivate"),
                              },
                            )
                          }
                          disabled={deleteRecurring.isPending}
                        >
                          {/* 14px trash glyph in compact list row */}
                          <Icon name={Trash2} size="sm" className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs text-center py-2">
                    No recurring schedules
                  </p>
                )}

                {showRecurringForm ? (
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Day</Label>
                        <Select value={recurDow} onValueChange={(v) => { if (v) setRecurDow(v) }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                              <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Time</Label>
                        <Select value={recurTime} onValueChange={(v) => { if (v) setRecurTime(v) }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 32 }, (_, i) => {
                              const h = Math.floor(i / 2) + 6
                              const m = (i % 2) * 30
                              if (h === 21 && m === 30) return null
                              const t = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
                              const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                              const ampm = h >= 12 ? "PM" : "AM"
                              return (
                                <SelectItem key={t} value={t}>
                                  {h12}:{m.toString().padStart(2, "0")} {ampm}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Select value={recurDuration} onValueChange={(v) => { if (v) setRecurDuration(v) }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[30, 60, 90, 120].map((d) => (
                              <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Package</Label>
                        <Select value={recurPackageId} onValueChange={(v) => { if (v) setRecurPackageId(v) }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(packages ?? [])
                              .filter((p) => p.status === "active")
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.total_sessions - p.sessions_used} left)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => {
                        if (!recurPackageId) {
                          toast.error("Select a package")
                          return
                        }
                        // Calculate start_date as next occurrence of day_of_week
                        const dow = parseInt(recurDow, 10)
                        const today = new Date()
                        const todayDow = today.getDay()
                        const diff = (dow - todayDow + 7) % 7 || 7
                        const startDate = new Date(today)
                        startDate.setDate(today.getDate() + diff)
                        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`

                        createRecurring.mutate(
                          {
                            client_id: id,
                            package_id: recurPackageId,
                            day_of_week: dow,
                            start_time: recurTime,
                            duration_mins: parseInt(recurDuration, 10),
                            start_date: startDateStr,
                          },
                          {
                            onSuccess: (data) => {
                              toast.success(`${data.created} sessions scheduled`)
                              setShowRecurringForm(false)
                              setRecurPackageId("")
                            },
                            onError: (err) =>
                              toast.error(err instanceof Error ? err.message : "Failed to create schedule"),
                          },
                        )
                      }}
                      disabled={createRecurring.isPending}
                    >
                      {createRecurring.isPending && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
                      Schedule sessions
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowRecurringForm(true)}
                  >
                    Add recurring schedule
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Payment reminder setting */}
          <div className="rounded-lg border p-4 space-y-2">
            <Label htmlFor="reminderDays" className="text-sm font-semibold">Payment reminder frequency</Label>
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
                {/* 12px spinner inside size="sm" Save button */}
                {reminderSaving ? <Icon name={Loader2} size="sm" className="size-3 animate-spin" /> : "Save"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Auto-send payment reminders every {reminderDays || "—"} days
            </p>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <ClientPaymentsTab clientId={id} />
        </TabsContent>
      </Tabs>

      <CreatePackageSheet clientId={id} open={pkgSheetOpen} onOpenChange={setPkgSheetOpen} />
    </div>
  )
}
