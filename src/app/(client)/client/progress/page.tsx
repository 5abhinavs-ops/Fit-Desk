"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MeasurementSheet } from "@/components/client/measurement-sheet"
import { TrendingUp, Flame, CalendarCheck, Target, Plus, Ruler } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { EmptyState } from "@/components/ui/empty-state"
import { format } from "date-fns"
import type { BodyMeasurement } from "@/types/database"

export default function ClientProgressPage() {
  const { data: identity, isLoading: identityLoading } = useClientIdentity()
  const supabase = createClient()
  const clientId = identity?.id
  const [measureOpen, setMeasureOpen] = useState(false)

  // Stats: total completed sessions
  const { data: totalSessions } = useQuery({
    queryKey: ["client-total-sessions", clientId],
    queryFn: async () => {
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId!)
        .eq("status", "completed")
      return count ?? 0
    },
    enabled: !!clientId,
  })

  // Stats: this month
  const { data: monthSessions } = useQuery({
    queryKey: ["client-month-sessions", clientId],
    queryFn: async () => {
      const now = new Date()
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId!)
        .eq("status", "completed")
        .gte("date_time", `${monthStr}-01T00:00:00+08:00`)
      return count ?? 0
    },
    enabled: !!clientId,
  })

  // Streak calculation
  const { data: streak } = useQuery({
    queryKey: ["client-streak", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("date_time")
        .eq("client_id", clientId!)
        .eq("status", "completed")
        .order("date_time", { ascending: false })
        .limit(100)

      if (!data || data.length === 0) return 0

      // Group by ISO week, count consecutive weeks
      const weeks = new Set<string>()
      for (const b of data) {
        const d = new Date(b.date_time)
        const jan1 = new Date(d.getFullYear(), 0, 1)
        const weekNum = Math.ceil(
          ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
        )
        weeks.add(`${d.getFullYear()}-W${weekNum}`)
      }

      // Current week
      const now = new Date()
      const jan1Now = new Date(now.getFullYear(), 0, 1)
      let currentWeekNum = Math.ceil(
        ((now.getTime() - jan1Now.getTime()) / 86400000 +
          jan1Now.getDay() +
          1) /
          7
      )
      let currentYear = now.getFullYear()
      let count = 0

      while (weeks.has(`${currentYear}-W${currentWeekNum}`)) {
        count++
        currentWeekNum--
        if (currentWeekNum <= 0) {
          currentYear--
          currentWeekNum = 52
        }
      }

      return count
    },
    enabled: !!clientId,
  })

  // Body measurements
  const { data: measurements } = useQuery({
    queryKey: ["client-measurements", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("client_id", clientId!)
        .order("measured_at", { ascending: false })
        .limit(20)
      return (data ?? []) as BodyMeasurement[]
    },
    enabled: !!clientId,
  })

  if (identityLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  // Weight trend SVG
  const weightReadings = (measurements ?? [])
    .filter((m) => m.weight_kg != null)
    .slice(0, 10)
    .reverse()

  function renderWeightChart() {
    if (weightReadings.length < 2) return null

    const weights = weightReadings.map((m) => m.weight_kg!)
    const minW = Math.min(...weights)
    const maxW = Math.max(...weights)
    const range = maxW - minW || 1
    const padding = 10

    const points = weightReadings.map((m, i) => {
      const x =
        padding +
        (i / (weightReadings.length - 1)) * (300 - 2 * padding)
      const y =
        padding +
        (1 - (m.weight_kg! - minW) / range) * (100 - 2 * padding)
      return { x, y, weight: m.weight_kg! }
    })

    const polyline = points.map((p) => `${p.x},${p.y}`).join(" ")

    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Weight trend</p>
          <svg viewBox="0 0 300 100" className="w-full h-24">
            <polyline
              fill="none"
              stroke="#00E096"
              strokeWidth="2"
              points={polyline}
            />
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#00E096"
              />
            ))}
            {/* Latest value label */}
            <text
              x={points[points.length - 1].x + 5}
              y={points[points.length - 1].y - 5}
              fill="#00E096"
              fontSize="10"
            >
              {points[points.length - 1].weight}kg
            </text>
          </svg>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Icon name={TrendingUp} size="lg" className="text-[#00E096]" />
        Progress
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Icon name={CalendarCheck} size="sm" className="text-[#00C6D4] mx-auto" />
            <p className="text-2xl font-semibold mt-1 tabular">{totalSessions ?? 0}</p>
            <p className="text-micro text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Icon name={Target} size="sm" className="text-[#FFB347] mx-auto" />
            <p className="text-2xl font-semibold mt-1 tabular">{monthSessions ?? 0}</p>
            <p className="text-micro text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Icon name={Flame} size="sm" className="text-[#FF4C7A] mx-auto" />
            <p className="text-2xl font-semibold mt-1 tabular">{streak ?? 0}</p>
            <p className="text-micro text-muted-foreground">Week streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Weight chart */}
      {renderWeightChart()}

      {/* Measurements: hero empty state when none, list + small button otherwise */}
      {(measurements ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Ruler}
              title="Track your progress"
              body="Log your weight or body fat to see trends over time."
              action={{
                label: "Log measurement",
                onClick: () => setMeasureOpen(true),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMeasureOpen(true)}
          >
            <Icon name={Plus} size="sm" className="mr-2" />
            Log measurement
          </Button>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Recent measurements
            </h2>
            {(measurements ?? []).slice(0, 5).map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {format(new Date(m.measured_at), "d MMM yyyy")}
                    </span>
                    <div className="flex items-center gap-3 text-sm">
                      {m.weight_kg != null && (
                        <span>{m.weight_kg}kg</span>
                      )}
                      {m.body_fat_pct != null && (
                        <span className="text-muted-foreground">
                          {m.body_fat_pct}%
                        </span>
                      )}
                    </div>
                  </div>
                  {m.notes && (
                    <p className="text-body-sm text-muted-foreground mt-1">
                      {m.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Goals */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold mb-2">Goals</h2>
          {identity?.goals ? (
            <p className="text-body-sm">{identity.goals}</p>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No goals set yet. Ask your PT to add your goals to your
              profile.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Measurement sheet */}
      {identity && (
        <MeasurementSheet
          clientId={identity.id}
          trainerId={identity.trainer_id}
          open={measureOpen}
          onOpenChange={setMeasureOpen}
        />
      )}
    </div>
  )
}
