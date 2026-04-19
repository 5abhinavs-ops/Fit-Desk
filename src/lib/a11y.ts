import type { KeyboardEvent } from "react"

/**
 * Returns an onKeyDown handler that activates the given callback on Enter or
 * Space. Used to make div-based rows keyboard-accessible alongside role="button"
 * and tabIndex={0}. Native <button> elements get this behaviour for free and
 * should NOT use this helper.
 */
export function handleKeyboardActivation<T extends Element>(
  handler: () => void,
): (event: KeyboardEvent<T>) => void {
  return (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handler()
    }
  }
}
