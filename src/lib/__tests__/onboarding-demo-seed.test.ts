import { describe, it, expect } from "vitest"
import {
  DEMO_CLIENT_FIRST_NAME,
  DEMO_CLIENT_LAST_NAME,
  DEMO_CLIENT_WHATSAPP,
  buildDemoClientPayload,
} from "../onboarding-demo-seed"

describe("demo client seed", () => {
  it("uses a recognisable placeholder name", () => {
    expect(DEMO_CLIENT_FIRST_NAME).toBe("Demo")
    expect(DEMO_CLIENT_LAST_NAME).toBe("Client")
  })

  it("uses an E.164-formatted placeholder phone", () => {
    expect(DEMO_CLIENT_WHATSAPP).toMatch(/^\+65\d{8}$/)
  })

  it("buildDemoClientPayload returns the shape expected by useCreateClient", () => {
    const payload = buildDemoClientPayload()
    expect(payload).toEqual({
      first_name: "Demo",
      last_name: "Client",
      whatsapp_number: DEMO_CLIENT_WHATSAPP,
      email: null,
      goals: "Demo client — safe to delete",
      injuries_medical: null,
      photo_url: null,
      emergency_contact_name: null,
      emergency_contact_phone: null,
      status: "active",
      whatsapp_opted_out: true,
    })
  })

  it("force-opts-out the demo row so the reminder cron never sends", () => {
    expect(buildDemoClientPayload().whatsapp_opted_out).toBe(true)
  })
})
