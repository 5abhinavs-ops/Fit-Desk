"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useQueryClient } from "@tanstack/react-query"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { Icon } from "@/components/ui/icon"
import { toast } from "sonner"

interface MeasurementSheetProps {
  clientId: string
  trainerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MeasurementSheet({
  clientId,
  trainerId,
  open,
  onOpenChange,
}: MeasurementSheetProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  const now = new Date()
  const sgtOffset = 8 * 60
  const sgt = new Date(now.getTime() + (sgtOffset + now.getTimezoneOffset()) * 60000)
  const todaySGT = sgt.toISOString().split("T")[0]

  const [date, setDate] = useState(todaySGT)
  const [weightKg, setWeightKg] = useState("")
  const [bodyFatPct, setBodyFatPct] = useState("")
  const [waistCm, setWaistCm] = useState("")
  const [chestCm, setChestCm] = useState("")
  const [hipsCm, setHipsCm] = useState("")
  const [notes, setNotes] = useState("")

  async function handleSave() {
    setLoading(true)
    try {
      const { error } = await supabase.from("body_measurements").insert({
        client_id: clientId,
        trainer_id: trainerId,
        measured_at: `${date}T00:00:00+08:00`,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        body_fat_pct: bodyFatPct ? parseFloat(bodyFatPct) : null,
        waist_cm: waistCm ? parseFloat(waistCm) : null,
        chest_cm: chestCm ? parseFloat(chestCm) : null,
        hips_cm: hipsCm ? parseFloat(hipsCm) : null,
        notes: notes || null,
      })

      if (error) throw error

      toast.success("Measurement saved")
      queryClient.invalidateQueries({ queryKey: ["client-measurements"] })
      onOpenChange(false)

      // Reset
      setWeightKg("")
      setBodyFatPct("")
      setWaistCm("")
      setChestCm("")
      setHipsCm("")
      setNotes("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log measurement</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="meas-date">Date</Label>
            <Input
              id="meas-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="70.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bodyfat">Body fat %</Label>
              <Input
                id="bodyfat"
                type="number"
                step="0.1"
                placeholder="18.0"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="waist">Waist (cm)</Label>
              <Input
                id="waist"
                type="number"
                step="0.5"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="chest">Chest (cm)</Label>
              <Input
                id="chest"
                type="number"
                step="0.5"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hips">Hips (cm)</Label>
              <Input
                id="hips"
                type="number"
                step="0.5"
                value={hipsCm}
                onChange={(e) => setHipsCm(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="meas-notes">Notes</Label>
            <textarea
              id="meas-notes"
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="How are you feeling?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="btn-gradient w-full"
            onClick={handleSave}
            disabled={loading}
          >
            {loading && <Icon name={Loader2} size="sm" className="mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
