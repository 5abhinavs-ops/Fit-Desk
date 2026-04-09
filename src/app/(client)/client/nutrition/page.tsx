"use client"

import { useState, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useClientIdentity } from "@/hooks/useClientIdentity"
import { useNutritionLogs } from "@/hooks/useNutritionLogs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  Camera,
  Loader2,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Salad,
} from "lucide-react"
import { format } from "date-fns"
import type { MealType } from "@/types/database"

type AnalysisState = "idle" | "analysing" | "editing" | "saving"

interface AnalysisResult {
  meal_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  confidence: string
  photo_url: string | null
  ai_raw_response: string | null
}

function MacroCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
}) {
  return (
    <Card>
      <CardContent className="p-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {icon}
          <span className="text-[10px] text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm font-bold">
          {Math.round(value)}
          {unit}
        </p>
      </CardContent>
    </Card>
  )
}

export default function ClientNutritionPage() {
  const { data: identity, isLoading: identityLoading } = useClientIdentity()
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const clientId = identity?.id ?? ""

  const now = new Date()
  const sgtOffset = 8 * 60
  const sgtTime = new Date(
    now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000
  )
  const today = sgtTime.toISOString().split("T")[0]

  const { data: todayLogs, isLoading } = useNutritionLogs(clientId, today)

  const [state, setState] = useState<AnalysisState>("idle")
  const isSaving = state === "saving"
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [mealType, setMealType] = useState<MealType>("lunch")
  const [editName, setEditName] = useState("")
  const [editCalories, setEditCalories] = useState("")
  const [editProtein, setEditProtein] = useState("")
  const [editCarbs, setEditCarbs] = useState("")
  const [editFat, setEditFat] = useState("")

  const totals = (todayLogs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories ?? 0),
      protein: acc.protein + (log.protein_g ?? 0),
      carbs: acc.carbs + (log.carbs_g ?? 0),
      fat: acc.fat + (log.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setState("analysing")

    const formData = new FormData()
    formData.append("image", file)

    try {
      const res = await fetch("/api/nutrition/analyse", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Analysis failed")
        setState("idle")
        return
      }

      setAnalysis(data)
      setEditName(data.meal_name || "")
      setEditCalories(data.calories != null ? String(data.calories) : "")
      setEditProtein(data.protein_g != null ? String(data.protein_g) : "")
      setEditCarbs(data.carbs_g != null ? String(data.carbs_g) : "")
      setEditFat(data.fat_g != null ? String(data.fat_g) : "")
      setState("editing")
    } catch {
      toast.error("Failed to analyse image")
      setState("idle")
    }

    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleSave() {
    if (!editName.trim()) {
      toast.error("Please enter a meal name")
      return
    }

    setState("saving")
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: analysis?.photo_url ?? null,
          meal_name: editName,
          meal_type: mealType,
          calories: editCalories ? parseInt(editCalories, 10) : null,
          protein_g: editProtein ? parseFloat(editProtein) : null,
          carbs_g: editCarbs ? parseFloat(editCarbs) : null,
          fat_g: editFat ? parseFloat(editFat) : null,
          ai_raw_response: analysis?.ai_raw_response ?? null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to save")
        setState("editing")
        return
      }

      toast.success("Meal logged!")
      queryClient.invalidateQueries({ queryKey: ["nutrition-logs"] })
      setState("idle")
      setPreviewUrl(null)
      setAnalysis(null)
    } catch {
      toast.error("Failed to save")
      setState("editing")
    }
  }

  function handleCancel() {
    setState("idle")
    setPreviewUrl(null)
    setAnalysis(null)
  }

  if (identityLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Salad className="h-6 w-6 text-[#84CC16]" />
        Food log
      </h1>

      {/* Daily summary */}
      <div className="grid grid-cols-4 gap-2">
        <MacroCard
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          label="Cal"
          value={totals.calories}
          unit=""
        />
        <MacroCard
          icon={<Beef className="h-4 w-4 text-red-500" />}
          label="Protein"
          value={totals.protein}
          unit="g"
        />
        <MacroCard
          icon={<Wheat className="h-4 w-4 text-amber-500" />}
          label="Carbs"
          value={totals.carbs}
          unit="g"
        />
        <MacroCard
          icon={<Droplets className="h-4 w-4 text-blue-500" />}
          label="Fat"
          value={totals.fat}
          unit="g"
        />
      </div>

      {/* Upload / Analysis flow */}
      {state === "idle" && (
        <div className="relative">
          <Button
            className="w-full h-24 text-lg gap-3"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="h-6 w-6" />
            Log a meal
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {state === "analysing" && (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Meal"
                className="mx-auto h-40 w-40 rounded-lg object-cover"
              />
            )}
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Analysing your meal...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "editing" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Meal"
                className="h-32 w-full rounded-lg object-cover"
              />
            )}

            {analysis?.confidence && (
              <Badge variant="secondary" className="text-xs">
                AI confidence: {analysis.confidence}
              </Badge>
            )}

            <div className="space-y-2">
              <Label>Meal name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Meal type</Label>
              <Select
                value={mealType}
                onValueChange={(v) =>
                  setMealType((v ?? "lunch") as MealType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Calories</Label>
                <Input
                  type="number"
                  value={editCalories}
                  onChange={(e) => setEditCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Protein (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editProtein}
                  onChange={(e) => setEditProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Carbs (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editCarbs}
                  onChange={(e) => setEditCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fat (g)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editFat}
                  onChange={(e) => setEditFat(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save meal
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state === "saving" && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            <p className="text-sm mt-2">Saving...</p>
          </CardContent>
        </Card>
      )}

      {/* Today's meals */}
      <h2 className="text-sm font-semibold">Today&apos;s meals</h2>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : !todayLogs || todayLogs.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">
          No meals logged today. Tap the button above to start.
        </p>
      ) : (
        <div className="space-y-2">
          {todayLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              {log.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={log.photo_url}
                  alt={log.meal_name ?? ""}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {log.meal_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.meal_type && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] mr-1"
                    >
                      {log.meal_type}
                    </Badge>
                  )}
                  {format(new Date(log.logged_at), "h:mm a")}
                </p>
              </div>
              <div className="text-right text-xs">
                {log.calories != null && (
                  <p className="font-medium">{log.calories} cal</p>
                )}
                <p className="text-muted-foreground">
                  {log.protein_g ?? 0}p / {log.carbs_g ?? 0}c /{" "}
                  {log.fat_g ?? 0}f
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
