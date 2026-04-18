# Empty States — Client App Inventory (Phase B)

Scope: `src/app/(client)/*`. Seven page-zone empty states covered by the shared `<EmptyState>` component (Path 1: icon + typography + optional CTA, no character illustrations).

## Rule: page-zone vs field-level emptiness

**`<EmptyState>` is for page-zone emptiness** — when a viewport region is dominated by the absence of data and the user needs orientation (what this area is, why it's empty, what to do next).

**Field-level or card-slot emptiness uses inline muted copy** — `text-body-sm text-muted-foreground` using Phase A typography tokens. Do NOT wrap field-level empties in `<EmptyState>`; it over-styles a micro-absence.

Concrete example of the inline case (kept as-is, NOT converted in Phase B):

- `src/app/(client)/client/progress/page.tsx:282-285` — "No goals set yet. Ask your PT to add your goals to your profile." is a field label inside a `<Card>`. Stays inline muted copy.

Don't conflate the two. If in doubt: does the empty region dominate the viewport section, or is it one line inside a populated card? Dominates → `<EmptyState>`. One line inside → inline muted copy.

## Inventory

7 rows. Rows 1–6 replace existing JSX; rows 7–8 add new empty states in currently silent-hide sites (approved FLAG B).

### Row 1 — Home: Next session

- **File:** `src/app/(client)/client/page.tsx:175-187`
- **Status:** replace (keeps existing `<Card className="card-border-cyan">` wrapper; replaces the inner `else` branch of `nextSession ? ... : ...`)
- **Current copy:** `No upcoming sessions` + conditional `Book a session →` link to `/book/${trainer.booking_slug}`
- **Proposed icon:** `CalendarPlus`
- **Proposed title:** `No upcoming sessions`
- **Proposed body:** `Book your next session with your trainer.` (shown only when `trainer.booking_slug` exists; else `null`)
- **Proposed action:** `trainer.booking_slug ? { label: "Book a session", href: \`/book/${trainer.booking_slug}\` } : undefined`
- **CTA wiring:** Existing functionality — same href pattern as the link removed from this site.

### Row 2 — Sessions: Upcoming list empty

- **File:** `src/app/(client)/client/sessions/page.tsx:202-205`
- **Status:** replace (inside the `(upcoming ?? []).length === 0` branch; loading is handled separately at line 112 and is not conflated)
- **Current copy:** `No upcoming sessions`
- **Icon:** `CalendarPlus`
- **Title:** `No sessions booked`
- **Body:** `Book your next session with your trainer.` (shown only when `identity.trainer.booking_slug` exists; else `null`)
- **Action:** `identity.trainer.booking_slug ? { label: "Book a session", href: \`/book/${identity.trainer.booking_slug}\` } : undefined`
- **CTA wiring:** Existing functionality — same public booking page already used in Row 1.
- **Note:** Title deliberately differs from Row 1 ("No upcoming sessions") because the sessions/upcoming tab already provides the "upcoming" context in the route. "No sessions booked" reads cleaner in-view.

### Row 3 — Sessions: Past list empty

- **File:** `src/app/(client)/client/sessions/page.tsx:221-222`
- **Status:** replace (inside the `(past ?? []).length === 0` branch; `pastLoading` skeleton is a sibling branch — not conflated)
- **Current copy:** `No past sessions`
- **Icon:** `History`
- **Title:** `No past sessions`
- **Body:** `Completed sessions will appear here.`
- **Action:** `undefined`
- **CTA wiring:** N/A. Past sessions auto-populate as sessions complete; no user-facing action.

### Row 4 — Payments: No payments at all

- **File:** `src/app/(client)/client/payments/page.tsx:158-162`
- **Status:** replace (after `isLoading` gate at line 46; renders only when `(payments ?? []).length === 0`)
- **Current copy:** `No payments yet`
- **Icon:** `Receipt`
- **Title:** `No payments yet`
- **Body:** `Payments will appear here once your trainer records them.`
- **Action:** `undefined`
- **CTA wiring:** N/A. Clients don't create payments; the PT records them. Informational only.

### Row 5 — Nutrition: No meals today

- **File:** `src/app/(client)/client/nutrition/page.tsx:403-406`
- **Status:** replace (inside `!todayLogs || todayLogs.length === 0` branch; `isLoading` is handled by the preceding skeleton branch — not conflated)
- **Current copy:** `No meals logged today. Tap the button above to start.`
- **Proposed icon:** `UtensilsCrossed`
- **Proposed title:** `No meals logged today`
- **Proposed body:** `Snap a photo of your next meal to start tracking.`
- **Proposed action:** `{ label: "Log a meal", onClick: () => fileRef.current?.click() }`
- **CTA wiring:** Existing functionality — triggers the same `fileRef` (line 76) used by the top-of-page "Log a meal" button at line 249. Replaces the fragile "Tap the button above" copy with a real action.

### Row 6 — Home: No active package (ADD NEW)

- **File:** `src/app/(client)/client/page.tsx` — new rendering in the `else` of the `activePackage` gate at line 192 (currently silent-hides when no active package exists)
- **Status:** add (approved FLAG B)
- **Current UI:** nothing renders
- **Icon:** `Package` (matches the populated-state icon at line 196, so the zone has visual continuity when a package appears)
- **Title:** `No active package`
- **Body:** `Ask your trainer to set up a package so you can start booking sessions.` (always renders; explains *why* this matters — blocks booking)
- **Action:** `trainer.whatsapp_number ? { label: "Message trainer", href: \`https://wa.me/${trainer.whatsapp_number.replace(/\\D/g, "")}\`, external: true } : undefined`
- **CTA wiring:** Existing functionality — reuses the exact `wa.me` URL pattern from the "My trainer" card at line 298-308 of the same file (same number normalisation). No new endpoint or handler.
- **Conditional CTA rendering (required):** When `trainer.whatsapp_number` is falsy, render the EmptyState with the body copy and **no action prop at all** (pass `undefined`). The component must render the body without a CTA in that case. Verified by B2 test case "no action → no button/link rendered".
- **External link requirement:** `external: true` flag causes the component to wrap the button in `<a target="_blank" rel="noopener noreferrer">` for security (XSS / window.opener hijack protection). B2 test asserts both attributes are present for external CTAs.

### Row 7 — Progress: No body measurements (ADD NEW)

- **File:** `src/app/(client)/client/progress/page.tsx` — new rendering in the `(measurements ?? []).length === 0` branch at line 241 (currently silent-hides the "Recent measurements" section and leaves the existing small "Log measurement" button visible)
- **Status:** add (approved FLAG B). Proposal: **replace** the existing plain "Log measurement" button (line 231-238) with the hero `<EmptyState>` when measurements is empty; when `≥1` measurement exists, show the small "Log measurement" button + list as today. Rationale: empty state is the hero when there's nothing to anchor the page; the small button is the "add another" affordance when there's already data.
- **Current UI:** a plain "Log measurement" `<Button variant="outline">` always visible + nothing else
- **Icon:** `Ruler`
- **Title:** `Track your progress` (leads with benefit, not absence)
- **Body:** `Log your weight or body fat to see trends over time.`
- **Action:** `{ label: "Log measurement", onClick: () => setMeasureOpen(true) }`
- **CTA wiring:** Existing functionality — triggers the existing `setMeasureOpen(true)` state and the existing `<MeasurementSheet>` (line 291-298). No new endpoint, no new state, no new handler.
- **Toggle (approved Ruling 2):** Empty → render only the hero `<EmptyState>` (hide the small "Log measurement" outline button). `≥1` measurement → render the small button + the recent-measurements list exactly as today. No in-between state.

## Wiring summary (all CTAs hook existing functionality)

| Row | CTA kind | Target | New wiring required? |
|---|---|---|---|
| 1 | internal link | `/book/[slug]` | No — already used on this site |
| 2 | internal link | `/book/[slug]` | No — same pattern as Row 1 |
| 3 | none | — | — |
| 4 | none | — | — |
| 5 | onClick | existing `fileRef.current?.click()` | No — existing ref |
| 6 | external link | `https://wa.me/${trainer.whatsapp_number}` | No — existing pattern on same file |
| 7 | onClick | existing `setMeasureOpen(true)` | No — existing state |

**Conclusion:** No row requires new API routes, new handlers, new state, or new data fetching. All seven can ship inside a single Phase B commit; no deferral to a later step is needed.

## Component contract — `<EmptyState>` action prop (locked before B2)

The `action` prop must handle four variants. Use a discriminated union so invalid combinations (e.g., both `href` and `onClick`) are rejected at compile time.

```ts
type EmptyStateActionInternalLink = {
  label: string
  href: string
  external?: false
  onClick?: never
}

type EmptyStateActionExternalLink = {
  label: string
  href: string
  external: true
  onClick?: never
}

type EmptyStateActionHandler = {
  label: string
  onClick: () => void
  href?: never
  external?: never
}

type EmptyStateAction =
  | EmptyStateActionInternalLink
  | EmptyStateActionExternalLink
  | EmptyStateActionHandler

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  body?: string
  action?: EmptyStateAction
  className?: string
}
```

Rendering rules the component must follow:

| Variant | Render |
|---|---|
| `undefined` action | No button, no link — body renders without CTA. |
| Internal link (`href`, no `external`) | Next `Link` wrapping `Button` with the label. |
| External link (`href`, `external: true`) | `<a href="..." target="_blank" rel="noopener noreferrer">` wrapping `Button` with the label. **Both `target="_blank"` and `rel="noopener noreferrer"` are required for security — prevents `window.opener` hijack and referrer leak.** |
| Handler (`onClick`) | `Button` with `onClick` and the label. |

B2 tests assert each of these four rendering paths and the security attributes on the external-link path.

## Not in scope (documented for completeness)

- `src/app/(client)/client/progress/page.tsx:282-285` — "No goals set yet." Field-level inline muted copy per the rule above. Keep as-is, but normalize the class from `text-sm text-muted-foreground` to `text-body-sm text-muted-foreground` in Phase B's refactor-cleaner pass to match Phase A typography tokens. (Tiny hygiene fix; not a component wiring.)
- `src/app/(client)/client/page.tsx:104-110` — "Could not load your profile." This is an **error state**, not an empty state, and is out of Phase B scope.
- `src/components/client/*` — action sheets (measurement, payment proof) and bottom nav. No empty-state hosts.

## Status

All 7 rows approved by user with row-specific edits (rows 2, 3, 4, 6, 7 tightened). Row 7 hero-vs-small-button toggle approved. Goals inline `text-sm → text-body-sm` micro-fix approved within Phase B scope (deferred to B5 refactor-cleaner). Component interface locked — 4-variant discriminated-union `action` prop with required security attrs on external links. B2 unblocked.
