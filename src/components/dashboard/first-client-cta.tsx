"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"
import { AddClientWithPackageSheet } from "@/components/clients/AddClientWithPackageSheet"

export function FirstClientCTA() {
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <EmptyState
            icon={Users}
            title="Your dashboard will come alive here"
            body="Add your first client to get started."
            headingLevel="h3"
            className="py-4"
            action={{
              label: "Add your first client →",
              onClick: () => setSheetOpen(true),
            }}
          />
        </CardContent>
      </Card>
      <AddClientWithPackageSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
