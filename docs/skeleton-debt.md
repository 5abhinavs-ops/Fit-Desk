# Skeleton Debt

Audit performed during Phase M. Catalogues every `Loader2` spinner in the app with a recommendation: shaped skeleton, keep-as-spinner, or inherently unshapeable.

## Classification

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ correct | Action-button spinner (submit, save, etc.) | Keep as-is |
| ⚠️ shapeable | Page-load spinner where final layout is known | Replace with `<Skeleton>` |
| 🧠 AI | Inherently unshapeable (variable AI output) | Keep as-is, flagged |

## Inventory

### Auth flows — all action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/(auth)/login/page.tsx` | 107, 169 | Sign-in button loading |
| `src/app/(auth)/reset-password/page.tsx` | 77 | Reset button loading |
| `src/app/(auth)/signup/page.tsx` | 130 | Signup button loading |
| `src/app/client/login/page.tsx` | 130, 174 | OTP request / verify button |

### Onboarding + upgrade — action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/onboarding/page.tsx` | 203 | Save profile button |

### Bookings (dashboard) — action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/(dashboard)/bookings/page.tsx` | 347 | Cancel-day action |
| `src/app/(dashboard)/bookings/page.tsx` | 384 | Copy-day action |

### Clients — action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/(dashboard)/clients/[id]/page.tsx` | 278 | Log session button |
| `src/app/(dashboard)/clients/[id]/page.tsx` | 521 | Recurring bookings save |
| `src/app/(dashboard)/clients/[id]/page.tsx` | 561 | Reminder save |

### Session actions — action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/session/[token]/session-actions.tsx` | 16-ish | Confirm / cancel / reschedule action buttons |

### Client app — action spinners (✅)
| File | Line | Context |
|------|------|---------|
| `src/app/(client)/client/sessions/page.tsx` | 278 | Action button |
| `src/app/(client)/client/nutrition/page.tsx` | 434 | Save nutrition log |

### Nutrition pages — AI-backed (🧠)
| File | Line | Context |
|------|------|---------|
| `src/app/(dashboard)/nutrition/page.tsx` | 206 | AI inference processing spinner |
| `src/app/(dashboard)/nutrition/page.tsx` | 279 | Page-load spinner (could be shaped) |
| `src/app/(client)/client/nutrition/page.tsx` | 288 | AI inference processing |
| `src/app/(client)/client/nutrition/page.tsx` | 449 | Page-load spinner (could be shaped) |

## Recommendations

- All ✅ action-button spinners stay. Replacing them with skeletons would be incorrect — spinners communicate "an action you triggered is running", skeletons communicate "data is loading into a known shape".

- The two page-load spinners at `nutrition/page.tsx:279` and `client/nutrition/page.tsx:449` are candidates for shaped skeletons. However, the nutrition-log cards have variable height based on meal content (empty vs photo vs AI-analyzed macros), so a single shaped skeleton would either look generic or mislead. **Leaving these as spinners for now** — revisit when the nutrition UI has a more stable steady-state layout.

- The AI inference spinners (🧠 rows) stay. AI call durations are 1-15s with unpredictable payload shapes; a spinner communicates "we're working on it" more honestly than a shaped placeholder that might look nothing like the result.

## Pre-existing skeletons (confirmed correct)

The following already use `<Skeleton>` at page-load — no change needed:
- `src/app/(dashboard)/page.tsx` — dashboard stat cards
- `src/app/(dashboard)/clients/page.tsx` — client list
- `src/app/(dashboard)/payments/page.tsx` — payments list
- `src/app/(dashboard)/bookings/page.tsx` — calendar week strip
- `src/app/(dashboard)/profile/page.tsx` — profile sections

## Phase M decision

No replacements land in Phase M. The inventory above is the deliverable — future phases can pick off individual items if/when the surrounding layout stabilizes.
