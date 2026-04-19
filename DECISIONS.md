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

_(Populated after Phase L commits.)_
