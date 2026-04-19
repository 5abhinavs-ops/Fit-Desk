// Meta WhatsApp Cloud API signals an opted-out recipient via error code
// 131047 (re-engagement required). Some templates also return codes whose
// human-readable message includes the phrase "opt out". Both paths are
// treated as opt-out for suppression purposes.

const OPT_OUT_CODE = 131047
const OPT_OUT_MESSAGE_RE = /\bopt(ed|ing)?[\s-]?out\b/i

export function isOptOutError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false

  const body = payload as { error?: unknown }
  const errorField = body.error
  if (!errorField || typeof errorField !== "object") return false

  const err = errorField as { code?: unknown; message?: unknown }
  if (err.code === OPT_OUT_CODE) return true
  if (typeof err.message === "string" && OPT_OUT_MESSAGE_RE.test(err.message)) {
    return true
  }

  return false
}
