import { describe, it, expect, vi } from "vitest"
import { handleKeyboardActivation } from "../a11y"

function makeKeyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent
}

describe("handleKeyboardActivation", () => {
  it("triggers the handler on Enter", () => {
    const handler = vi.fn()
    const onKeyDown = handleKeyboardActivation(handler)
    onKeyDown(makeKeyEvent("Enter"))
    expect(handler).toHaveBeenCalledOnce()
  })

  it("triggers the handler on Space", () => {
    const handler = vi.fn()
    const onKeyDown = handleKeyboardActivation(handler)
    onKeyDown(makeKeyEvent(" "))
    expect(handler).toHaveBeenCalledOnce()
  })

  it("does not trigger the handler on Tab", () => {
    const handler = vi.fn()
    const onKeyDown = handleKeyboardActivation(handler)
    onKeyDown(makeKeyEvent("Tab"))
    expect(handler).not.toHaveBeenCalled()
  })

  it("does not trigger the handler on arbitrary letter keys", () => {
    const handler = vi.fn()
    const onKeyDown = handleKeyboardActivation(handler)
    onKeyDown(makeKeyEvent("a"))
    expect(handler).not.toHaveBeenCalled()
  })

  it("calls preventDefault when activation key is pressed", () => {
    const event = makeKeyEvent("Enter")
    const onKeyDown = handleKeyboardActivation(() => {})
    onKeyDown(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it("does not call preventDefault for non-activation keys", () => {
    const event = makeKeyEvent("Tab")
    const onKeyDown = handleKeyboardActivation(() => {})
    onKeyDown(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})
