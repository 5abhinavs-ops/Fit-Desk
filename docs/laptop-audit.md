# Laptop Viewport Audit — Phase F

**Audit date:** 2026-04-19
**Author:** planner agent (Opus), reviewed by lead
**Target viewports:** 1280px, 1440px, 1920px
**Scope:** Authenticated FitDesk routes under `(dashboard)` and `(client)`
**Out of scope:** `/welcome`, `/book/[slug]`, `(auth)` pages — each has its own tuned layout.

---

## 1. Visually-abandoned routes at laptop width

The `max-w-lg` (448px) phone column sits in the center of a flat `#0D1B2A` background with no scaffolding around it. This produces the "floating column in empty white space" look on all laptop viewports.

Affected wrappers (exactly two files own the shape):
- `src/app/(dashboard)/layout.tsx:9-15` — PT dashboard wrapper.
- `src/app/(client)/layout.tsx:35-42` — Client-app wrapper (magic-link portal).

Auth pages (`src/app/(auth)/layout.tsx`) are already hero-centered on dark and render intentionally — no change.

## 2. Interactive elements lacking focus / keyboard handling

### Clickable `<div>` rows (not keyboard-reachable)
- `src/components/clients/ClientCard.tsx:22-26` — row navigates to `/clients/[id]` via `router.push`.
- `src/app/(dashboard)/page.tsx:230-246, 263-279` — low-session + lapsed rows.
- `src/app/(dashboard)/analytics/page.tsx:219, 261` — same pattern.
- `src/app/(dashboard)/payments/page.tsx:126-132` — payment rows open a sheet.

Zero `onKeyDown`, `tabIndex`, or `role` usage confirmed by grep.

### Clickable status span
- `src/app/(dashboard)/clients/[id]/page.tsx:189-196` — `<Badge>` is a span with `onClick + cursor-pointer`, no keyboard path.

### Text buttons without focus-visible ring
- `src/app/(auth)/login/page.tsx:111-117` — "Back to sign in" button.
- `src/app/(auth)/login/page.tsx:148-154` — "Forgot password?" button.
- `src/app/(dashboard)/clients/[id]/page.tsx:311-324, 333-347` — collapse toggle buttons.

### Missing autofocus on first field
- Login page email input (`(auth)/login/page.tsx:135-142`).
- Add-client sheet first-name input (`AddClientWithPackageSheet.tsx:241-245`).

## 3. Bottom sheets that should be centered modals at laptop width

`src/components/ui/sheet.tsx:40-81` — `SheetContent` with `side="bottom"` today renders full-width pinned to bottom at every viewport. **9 consumers**, all using `side="bottom"`:

1. `src/components/clients/AddClientWithPackageSheet.tsx:231`
2. `src/components/clients/AddClientSheet.tsx:100`
3. `src/components/clients/CreatePackageSheet.tsx:82`
4. `src/components/clients/CreateBookingSheet.tsx:170`
5. `src/components/clients/BookingActionSheet.tsx:166`
6. `src/components/clients/PaymentDetailSheet.tsx:156`
7. `src/components/clients/LogPaymentSheet.tsx:72`
8. `src/components/client/payment-proof-sheet.tsx:96`
9. `src/components/client/measurement-sheet.tsx:87`

**Decision (approved by lead):** centralise the `md:` treatment in `SheetContent`. Zero per-consumer diff. Shared-primitive change follows Phase D EmptyState precedent.

## 4. Hover-state gaps where mouse users expect them

- **FAB buttons** — `fab-glow` utility in `globals.css:171-174` has no `:hover`. Affects three FABs: clients, bookings, payments.
- **Anchor buttons on client detail** (`clients/[id]/page.tsx:201-218`) — has `hover:bg-accent` but no border accent to match Button.
- **Cancel/unblock-day inline button** (`bookings/page.tsx:258-263`) — no hover.
- **Status badge** (after conversion to `<button>` in keyboard pass) — will need `hover:opacity-90`.

### Already covered (no change required)
- All shadcn `<Button>` variants — hover in `button.tsx`.
- `<a>` tags in `dialog.tsx:141-143`.
- Navigation arrows on bookings page (Ghost button inherits hover).

## 5. Excluded routes (per constraint)

- `/welcome` and all welcome/* components — tuned in Phase E.
- `/book/[slug]` — tuned in Phase D.
- `src/components/shared/bottom-nav.tsx` + `client-bottom-nav.tsx` — untouched per "no sidebar nav" constraint.

## 6. Summary of change surface

- **2 wrapper layouts** get `md:` backdrop + card framing.
- **1 shared primitive** (`sheet.tsx`) gets additive `md:` classes + optional `desktopBehavior` prop.
- **1 new helper** (`src/lib/a11y.ts`) — `handleKeyboardActivation`.
- **6 clickable-row sites** + login text buttons + client detail collapses get focus/keyboard treatment.
- **`globals.css`** gets fab-glow `:hover` + transition.

Mobile (<768px) is byte-identical after all changes.
