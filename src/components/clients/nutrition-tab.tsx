"use client"

import { useState } from "react"
import { useNutritionLogs } from "@/hooks/useNutritionLogs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Camera, Flame, Beef, Wheat, Droplets } from "lucide-react"
import { format, subDays } from "date-fns"

interface NutritionTabProps {
  clientId: string
}

export function NutritionTab({ clientId }: NutritionTabProps) {
  const now = new Date()
  const sgtOffset = 8 * 60
  const sgtTime = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
  const todayStr = sgtTime.toISOString().split("T")[0]

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const { data: logs, isLoading } = useNutritionLogs(clientId, selectedDate)

  // Daily totals
  const totals = (logs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein: acc.protein + (log.protein_g ?? 0),
      carbs: acc.carbs + (log.carbs_g ?? 0),
      fat: acc.fat + (log.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  // 7-day calorie summary
  const last7days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(todayStr), 6 - i)
    return format(d, "yyyy-MM-dd")
  })

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <Input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        max={todayStr}
      />

      {/* Day summary */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat icon={<Flame className="h-3 w-3 text-orange-500" />} value={totals.calories} label="cal" />
        <MiniStat icon={<Beef className="h-3 w-3 text-red-500" />} value={totals.protein} label="g prot" />
        <MiniStat icon={<Wheat className="h-3 w-3 text-amber-500" />} value={totals.carbs} label="g carb" />
        <MiniStat icon={<Droplets className="h-3 w-3 text-blue-500" />} value={totals.fat} label="g fat" />
      </div>

      {/* Meals list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ) : !logs || logs.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">
          No meals logged on {format(new Date(selectedDate + "T12:00:00"), "EEEE, d MMMM")}
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              {log.photo_url ? (
                <img src={log.photo_url} alt={log.meal_name ?? ""} className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{log.meal_name}</p>
                <p className="text-xs text-muted-foreground">
                  {log.meal_type && <Badge variant="secondary" className="text-[10px] mr-1">{log.meal_type}</Badge>}
                  {format(new Date(log.logged_at), "h:mm a")}
                </p>
              </div>
              <div className="text-right text-xs shrink-0">
                {log.calories != null && <p className="font-medium">{log.calories} cal</p>}
                <p className="text-muted-foreground">
                  {log.protein_g ?? 0}p · {log.carbs_g ?? 0}c · {log.fat_g ?? 0}f
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-lg border p-2 text-center">
      <div className="flex items-center justify-center gap-1">{icon}</div>
      <p className="text-xs font-bold">{Math.round(value)}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
