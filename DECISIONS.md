# Phase L + Phase M Autonomous Decisions

This file logs every non-obvious decision made during the autonomous back-to-back execution of Phases L (WhatsApp Automation) and M (Hardening). The user authorised autonomous decision-making; this is the audit trail.

---

## Phase L — WhatsApp Automation Improvements

### L.1 — Data model

**D-L1**: `whatsapp_logs` table keyed on `id uuid`, `trainer_id uuid`, `client_id uuid nullable`, `template_name text`, `sent_at timestamptz default now()`, `status text` (`sent` / `suppressed_opt_out` / `failed`). `client_id` is nullable because PT-facing messages (e.g. `new_booking_request`) have no client recipient — they go to the PT's own number. Foreign keys `ON DELETE CASCADE` for trainer, `ON DELETE SET NULL` for client.
**Why**: Matches existing table conventions (profiles, clients, bookings all use uuid + trainer_id). Nullable client lets PT-facing log rows persist. SET NULL on client deletion preserves the audit log.

**D-L2**: `whatsapp_opted_out` column added to `clients` as `boolean NOT NULL DEFAULT false`.
**Why**: Matches existing client-table column conventions (e.g. `payment_reminder_days`). NOT NULL DEFAULT false so existing rows are safe and ts narrowing is tight (no `boolean | null`).

**D-L3**: Migration backfill — none. New table starts empty per user spec. New column defaults to false for existing rows.

### L.2 — RLS

**D-L4**: RLS on `whatsapp_logs` — trainers can SELECT their own rows only. Service role (used by send pipeline) can INSERT. No UPDATE / DELETE policies for trainers — logs are append-only.
**Why**: Matches the append-only audit-log pattern. PT can read history but can't doctor it.

### L.3 — sendTemplateMessage signature

**D-L5**: Add two optional params: `trainerId?: string`, `clientId?: string`. Both must be provided to log or suppress; if either is missing, log is skipped and opt-out check is skipped (no DB call).
**Why**: Keeps the pure-send contract for existing callers that don't have context (e.g. test fixtures). Extends additively — no caller-site breakage.

**D-L6**: Opt-out suppression check happens BEFORE the API call, inside `sendTemplateMessage`. Returns `{ success: false, reason: "opted_out" }` without hitting Meta.
**Why**: Single source of truth. Callers can't accidentally bypass suppression.

**D-L7**: Opt-out detection on error response — check `error.code === 131047` OR `typeof error.message === "string"` AND `/opt\s*out|opted\s*out/i.test(error.message)`.
**Why**: Meta's error code 131047 is documented for re-engagement / opted-out recipients. String fallback catches template rejections that include "opt out" phrasing.

**D-L8**: Log insertion is fire-and-forget AFTER the result is computed. Log failures are swallowed (console.error, but don't affect caller's return value).
**Why**: Log infrastructure must not take down the messaging pipeline.

### L.4 — UI — "Recent automations"

**D-L9**: Use native `<details>` / `<summary>` HTML, not a new Collapsible component.
**Why**: Zero new dependencies, zero new component surface area, semantically correct for a user-toggleable section. Phase L doesn't redesign — minimal footprint.

**D-L10**: List limited to 50 most recent rows. "Load more" not included — PTs scanning their automation log don't need deep history.
**Why**: Bounded read, matches dashboard query conventions. Can add pagination later.

**D-L11**: Template display labels mapped from raw template names via a dictionary in `src/lib/whatsapp-template-labels.ts`. Unknown template names fall back to the raw value with underscores replaced by spaces and title-case.
**Why**: Readable rows without a separate i18n system.

### L.5 — Client list badge

**D-L12**: Badge copy: "Reminders paused" with `badge-warning` (amber) style.
**Why**: Matches existing `status=paused` colour vocabulary. Clear, non-alarming copy — this is a client preference, not a trainer error.

**D-L13**: Badge placement — rendered adjacent to the existing status badge in `ClientCard`, not replacing it.
**Why**: Two independent facts (active/paused vs opt-out). Stacking badges preserves both.

### L.6 — Warm booking confirmation

**D-L14**: Enhance parameters sent to the existing `new_booking_request` template — do not introduce a new template name.
**Why**: Scope says "do not change the template name". Warmth comes from the parameter values. PT can update the Meta template body to incorporate the richer parameters.

**D-L15**: Date formatted as `"Tuesday 22 April"` via `date-fns` `format(d, "EEEE d MMMM")`. Location passed as `profile.training_locations?.[0] ?? ""`. Trainer name stays. Final parameter `closing` contains `"💪"` so the template can append it.
**Why**: Matches user spec exactly. Empty string for missing location keeps template params positional.

### L.7 — Tests

**D-L16**: TDD for pure helpers only — opt-out detection helper + template-label dictionary + warm-params builder. UI test for "Recent automations" collapsible. Skip integration tests for the send pipeline (requires live Meta API mocking that's more complex than Phase L justifies).
**Why**: High-value test surface is the pure helpers. The pipeline is already exercised by existing reminder cron tests (if any).

---

## Phase M — Hardening

### M.1 — Composite index on nutrition_logs

**D-M1**: The composite index `(trainer_id, logged_at DESC)` already exists — it was added by migration `20260409_nutrition_logs_index_and_rls_cleanup.sql`. Phase M creates a new migration file that re-asserts the index with `CREATE INDEX IF NOT EXISTS` (idempotent no-op) AND adds Phase M's own audit comments + any missed supporting indexes.
**Why**: User spec asks for "a new migration file" even though the index already exists. I treat the migration file as a defensive belt-and-braces re-assertion plus a documented audit trail, not a destructive rewrite.

### M.2 — RLS policy audit on nutrition_logs

**D-M2**: Current active policies on `nutrition_logs` (per `schema.sql`):
- `"PTs can insert logs for their clients"` — INSERT with check `trainer_id = auth.uid()`
- `"PTs can view logs for their clients"` — SELECT with `trainer_id = auth.uid()`
  
Dead client-auth policies (`"Clients can insert their own logs"` and `"Clients can view their own logs"`) were already dropped by `20260409`. No additional dead policies to remove. The migration records this audit finding in comments.
**Why**: Auditable paper trail. Future engineers see Phase M checked and found nothing further to drop.

**D-M3**: Add explicit `UPDATE` and `DELETE` policies scoped to `trainer_id = auth.uid()`. Currently, without explicit policies, PT writes for UPDATE/DELETE are DENIED by RLS (fail-closed default) — but the nutrition app surface needs PT-level edit and delete. Add policies only if the UI actually needs them. Check the hooks before adding.
**Why**: RLS must match actual UI needs. Over-permissive is a security risk; under-permissive breaks features.

### M.3 — Error boundary audit

**D-M4**: The existing `src/components/error-boundary.tsx` ALREADY wraps all dashboard routes via `(dashboard)/layout.tsx` and all client routes via `(client)/layout.tsx`. Also wraps `book/[slug]/page.tsx` explicitly. The dashboard routes listed in scope (/, /clients, /clients/[id], /bookings, /payments, /profile) are covered automatically by the group layout.
**Why**: No per-route wrapping needed — the layout pattern gives blanket coverage.

**D-M5**: `/upgrade` and `/upgrade/success` are NOT under the `(dashboard)` group — they live at `src/app/upgrade/page.tsx`. User spec explicitly lists `/upgrade` as needing an error boundary. Add a wrapper.
**Why**: Spec compliance + genuine value — Stripe redirect failures should show a graceful fallback rather than a blank error page.

### M.4 — Skeleton coverage

**D-M6**: Most `Loader2` usages in the codebase are in action buttons (submit, save, cancel) — these are CORRECT uses of a spinner for action feedback, not page loading. I do NOT replace these.
**Why**: Buttons with unknown action duration benefit from a spinner; skeletons are only right when the resulting layout is predictable.

**D-M7**: Page-level loaders on AI-dependent pages (`/nutrition` dashboard + client, nutrition image upload) stay as spinners. Document as skeleton-debt because AI inference response shape is inherently unpredictable.
**Why**: A shaped skeleton implies a known resulting layout; AI output length and structure aren't deterministic.

**D-M8**: Create `docs/skeleton-debt.md` listing each spinner usage, classified as either "action-button (correct)", "page-load shapeable (replace if layout known)", or "inherently unshapeable (AI / variable response)".
**Why**: Phase M deliverable per user spec.

### M.5 — Vercel Analytics

**D-M9**: Add `@vercel/analytics` as a dependency even though project rule is "no new deps". User explicitly requested this package.
**Why**: Explicit user override of the no-new-deps rule for this one package.

**D-M10**: Use `npm install` (not `pnpm add`) because the project uses npm (per `package-lock.json` present, no `pnpm-lock.yaml`).
**Why**: Package-manager hygiene — mixing managers creates lockfile drift.

**D-M11**: Render `<Analytics />` inside `<body>`, AFTER `<Toaster />`, so it doesn't interfere with focus order or landmark semantics.
**Why**: Analytics script is non-interactive; tree position doesn't affect behavior, but after interactive content is cleaner.

### M.6 — Commit strategy

**D-M12**: Phase M commit excludes Cursor's WIP files (same rule as Phase L). Stage only migration + docs + layout.tsx + any error-boundary additions.
**Why**: User directive — Cursor's WIP is not ours to land.

### M.7 — Post-review follow-ups

**D-M13**: Wrap `auth.uid()` in `(SELECT auth.uid())` in all RLS policies touched by Phases L + M. database-reviewer flagged this as MEDIUM performance debt: bare function calls get re-evaluated per row, the subquery form caches once per statement. Applied to both nutrition_logs policies and the whatsapp_logs SELECT policy within the Phase M migration.
**Why**: Supabase-recommended RLS performance pattern. Row-scanning dashboard queries would otherwise re-evaluate `auth.uid()` N times per row scan.

**D-M14**: Sync `schema.sql` with Phase L additions (whatsapp_logs table, whatsapp_opted_out column) and the Phase M policy optimisation. Without the sync, a fresh-env bootstrap from `schema.sql` alone would diverge from one built by replaying all migrations.
**Why**: Canonical fresh-env definition must mirror the migration chain. database-reviewer flagged the drift as LOW; fixing it closes the loop.

**D-M15**: Add `componentDidCatch` to the existing `ErrorBoundary` class component, logging `error + componentStack` via `console.error`. code-reviewer flagged the silent-swallow as MEDIUM for a revenue-critical path (/upgrade). Hardening phase is the right time to fix it.
**Why**: Server-side Vercel captures `console.error`; client-side DevTools surface it. Every future error boundary wrapper benefits, not just `/upgrade`.

