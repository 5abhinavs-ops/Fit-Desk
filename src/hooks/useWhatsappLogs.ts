"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface WhatsappLogRow {
  id: string
  template_name: string
  sent_at: string
  status: "sent" | "suppressed_opt_out" | "failed"
  client_id: string | null
  client_name: string | null
}

const WHATSAPP_LOGS_LIMIT = 50

const VALID_STATUSES = ["sent", "suppressed_opt_out", "failed"] as const

function narrowStatus(raw: unknown): WhatsappLogRow["status"] {
  if (typeof raw === "string" && (VALID_STATUSES as readonly string[]).includes(raw)) {
    return raw as WhatsappLogRow["status"]
  }
  return "failed"
}

function extractClientName(raw: unknown): string | null {
  if (raw == null || typeof raw !== "object") return null
  const c = raw as { first_name?: unknown; last_name?: unknown }
  const first = typeof c.first_name === "string" ? c.first_name : ""
  const last = typeof c.last_name === "string" ? c.last_name : ""
  const full = `${first} ${last}`.trim()
  return full.length > 0 ? full : null
}

export function useWhatsappLogs() {
  const supabase = createClient()
  return useQuery({
    queryKey: ["whatsapp_logs"],
    queryFn: async (): Promise<WhatsappLogRow[]> => {
      const { data, error } = await supabase
        .from("whatsapp_logs")
        .select(
          "id, template_name, sent_at, status, client_id, clients(first_name, last_name)"
        )
        .order("sent_at", { ascending: false })
        .limit(WHATSAPP_LOGS_LIMIT)
      if (error) throw error

      return (data ?? []).map((row) => {
        // Supabase returns the join as `clients` — narrow with a runtime
        // shape check so a schema rename or missing row surfaces as null
        // instead of rendering "undefined undefined".
        const client = extractClientName(row.clients)
        return {
          id: row.id,
          template_name: row.template_name,
          sent_at: row.sent_at,
          status: narrowStatus(row.status),
          client_id: row.client_id,
          client_name: client,
        }
      })
    },
    staleTime: 30_000,
  })
}
