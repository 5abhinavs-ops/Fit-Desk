import { describe, it, expect } from "vitest"
import { buildBookingConfirmationParams } from "../booking-confirmation-params"

describe("buildBookingConfirmationParams", () => {
  it("formats date as 'Tuesday 22 April' per spec", () => {
    const params = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: "Sentosa Park",
    })
    const dateParam = params.find((p) => p.name === "date_formatted")
    expect(dateParam?.value).toMatch(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/)
  })

  it("includes trainer name and client name verbatim", () => {
    const params = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: null,
    })
    expect(params.find((p) => p.name === "trainer_name")?.value).toBe("Avi")
    expect(params.find((p) => p.name === "client_name")?.value).toBe("Ben")
  })

  it("falls back to empty string when location is null or undefined", () => {
    const nullParams = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: null,
    })
    expect(nullParams.find((p) => p.name === "location")?.value).toBe("")

    const undefinedParams = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: undefined,
    })
    expect(undefinedParams.find((p) => p.name === "location")?.value).toBe("")
  })

  it("includes a 💪 closing parameter", () => {
    const params = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: "Park",
    })
    const closing = params.find((p) => p.name === "closing")
    expect(closing?.value).toContain("💪")
  })

  it("returns all required parameter names", () => {
    const params = buildBookingConfirmationParams({
      trainerName: "Avi",
      clientName: "Ben",
      dateIso: "2026-04-21T10:00:00Z",
      time: "10:00",
      sessionType: "1-on-1",
      location: "Park",
    })
    const names = params.map((p) => p.name).sort()
    expect(names).toEqual(
      [
        "client_name",
        "closing",
        "date_formatted",
        "location",
        "session_type",
        "time",
        "trainer_name",
      ].sort()
    )
  })
})
