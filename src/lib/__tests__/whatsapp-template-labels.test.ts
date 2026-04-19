import { describe, it, expect } from "vitest"
import { getTemplateLabel } from "../whatsapp-template-labels"

describe("getTemplateLabel", () => {
  it("returns a human-readable label for known templates", () => {
    expect(getTemplateLabel("session_reminder_24h_with_link")).toBe(
      "24-hour session reminder"
    )
    expect(getTemplateLabel("session_reminder_1h")).toBe("1-hour session reminder")
    expect(getTemplateLabel("package_low_sessions")).toBe(
      "Package running low"
    )
    expect(getTemplateLabel("new_booking_request")).toBe("New booking request")
    expect(getTemplateLabel("booking_pending_approval")).toBe(
      "Booking pending approval"
    )
  })

  it("falls back to title-cased template name for unknown templates", () => {
    expect(getTemplateLabel("some_new_template_name")).toBe(
      "Some New Template Name"
    )
  })

  it("handles empty string safely", () => {
    expect(getTemplateLabel("")).toBe("")
  })

  it("handles single-word template names", () => {
    expect(getTemplateLabel("checkin")).toBe("Checkin")
  })
})
