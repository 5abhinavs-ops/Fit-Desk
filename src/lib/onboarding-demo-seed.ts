/**
 * Seed data for the onboarding "Try with demo client" path. Lets a new PT
 * experience the dashboard + package + share flows without having to recall a
 * real client's phone number at signup time.
 */

export const DEMO_CLIENT_FIRST_NAME = "Demo" as const
export const DEMO_CLIENT_LAST_NAME = "Client" as const
// +65 9000 0001 — valid E.164 format, in an unassigned Singapore mobile range.
// If Meta's WhatsApp Cloud API attempts a send it will fail gracefully; the
// PT can delete the client once they've finished exploring.
export const DEMO_CLIENT_WHATSAPP = "+6590000001" as const

export interface DemoClientPayload {
  first_name: string
  last_name: string
  whatsapp_number: string
  email: string | null
  goals: string | null
  injuries_medical: string | null
  photo_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  status: "active"
  // Force-opt-out so the 30-min reminder cron never fires real Twilio/Meta
  // sends for the demo row. If +65 9000 0001 ever becomes a live number,
  // this also prevents unsolicited messages to a stranger.
  whatsapp_opted_out: true
}

export function buildDemoClientPayload(): DemoClientPayload {
  return {
    first_name: DEMO_CLIENT_FIRST_NAME,
    last_name: DEMO_CLIENT_LAST_NAME,
    whatsapp_number: DEMO_CLIENT_WHATSAPP,
    email: null,
    goals: "Demo client — safe to delete",
    injuries_medical: null,
    photo_url: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    status: "active",
    whatsapp_opted_out: true,
  }
}
