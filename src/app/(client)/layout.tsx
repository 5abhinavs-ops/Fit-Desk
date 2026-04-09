import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientBottomNav } from "@/components/client/client-bottom-nav"
import { ErrorBoundary } from "@/components/error-boundary"

export const dynamic = "force-dynamic"

export default async function ClientLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/client/login")
  }

  // Verify this user is a client (has a row in clients with auth_user_id)
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!client) {
    // This user is a PT, not a client — redirect to PT dashboard
    redirect("/")
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <main className="mx-auto max-w-lg px-4 py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <ClientBottomNav />
    </div>
  )
}
