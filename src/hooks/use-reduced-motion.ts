import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

// useSyncExternalStore is the canonical SSR-safe subscription pattern:
// - getServerSnapshot runs during server render and hydration before client
//   state exists, returning `false` so animated branches don't mount in HTML.
// - getSnapshot runs synchronously on every client render, so a user with a
//   reduced-motion preference never sees a pre-hydration flash of motion.
// - subscribe is idempotent — React manages the event listener lifecycle.

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", callback)
  return () => {
    mql.removeEventListener("change", callback)
  }
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Private named export kept for unit tests; DO NOT import outside __tests__.
export const _internals = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  QUERY,
}
