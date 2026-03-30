"use client"

import { useState } from "react"
import { useCreatePackage } from "@/hooks/usePackages"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreatePackageSheetProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePackageSheet({ clientId, open, onOpenChange }: CreatePackageSheetProps) {
  const createPackage = useCreatePackage()
  const [name, setName] = useState("")
  const [totalSessions, setTotalSessions] = useState("10")
  const [price, setPrice] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0])
  const [expiryDate, setExpiryDate] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    createPackage.mutate(
      {
        client_id: clientId,
        name,
        total_sessions: parseInt(totalSessions, 10),
        price: parseFloat(price),
        start_date: startDate,
        expiry_date: expiryDate || null,
      },
      {
        onSuccess: () => {
          toast.success("Package created")
          setName("")
          setTotalSessions("10")
          setPrice("")
          setExpiryDate("")
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to create package")
        },
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create package</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="pkgName">Package name</Label>
            <Input
              id="pkgName"
              placeholder="10-session PT pack"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sessions">Total sessions</Label>
              <Input
                id="sessions"
                type="number"
                min={1}
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step="0.01"
                placeholder="500"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createPackage.isPending}>
            {createPackage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create package
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
