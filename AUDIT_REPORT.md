# FitDesk 100% Functionality Audit Report

**Audit date:** 2026-04-21
**Branch:** dev-1 @ `7ffd36f`
**Scope:** Phases 1–6 across infrastructure, integrations, features, security, UX, and monitoring.
**Mode:** Audit-only (no fixes applied).

---

## Executive Summary

**Overall Status:** NOT READY for public launch

**Final verification (all GREEN):**
- `npx tsc --noEmit` → exit 0
- `npm run build` → all 51 routes compiled
- `npm run lint` → exit 0
- `npm test` → exit 0

Build is clean, but a substantial set of functional, security, and compliance gaps must be closed before launch. Most critical: missing legal pages, missing error tracking, a Stripe upgrade authorization gap, a broken client-portal nutrition flow, and unrate-limited AI/upload endpoints.

**Total Issues Found:** 71
- **CRITICAL:** 6
- **HIGH:** 18
- **MEDIUM:** 30
- **LOW:** 17

## Phase Results

| Phase | Area | Status |
|-------|------|--------|
| 1 | Infrastructure | ⚠ Warn — schema drift, storage gaps, env-example gaps |
| 2 | Integrations | ❌ Blocker — Stripe auth gap, WhatsApp dead code, OTP flow bugs |
| 3 | Core Features | ❌ Blocker — client nutrition flow broken, cron idempotency, webhook gap |
| 4 | Security | ⚠ Warn — rate limiting + CSRF + error leakage |
| 5 | Polish & UX | ⚠ Warn — no real logo, ~20 hex codes bypass theme |
| 6 | Monitoring/Support | ❌ Blocker — no error tracking, no ToS/Privacy, no support channel |

---

## Master Issue List

### CRITICAL Issues (must fix before any launch)

1. **Stripe `checkout.session.completed` does not verify `metadata.user_id` against the authenticated customer.** A replay or tampered metadata value could upgrade an arbitrary profile to Pro. — Phase 2 — `src/app/api/webhooks/stripe/route.ts:27-31`
2. **No Terms of Service page.** Required for Stripe, Meta WhatsApp onboarding, and PDPA/GDPR compliance before collecting user data. — Phase 6 — no route exists
3. **No Privacy Policy page.** Same compliance requirement; also required by Meta for WhatsApp Business verification. — Phase 6 — no route exists
4. **No error tracking configured (Sentry / Rollbar / PostHog absent).** Production errors will go silently unreported. — Phase 6 — `package.json`, no `Sentry.init` anywhere
5. **No `error.tsx`, `not-found.tsx`, or `global-error.tsx` at app root.** A crash or 404 shows the default Next.js page with no support link or branded recovery path. — Phase 6 — `src/app/`
6. **`TWILIO_*` env vars (and `ANTHROPIC_API_KEY`) missing from `.env.local.example`.** A fresh deploy will have silently broken WhatsApp/AI — no startup error, just runtime failure on every send or AI call. — Phase 1 — `.env.local.example`

### HIGH Priority Issues (should fix before launch)

1. **`src/lib/twilio.ts` is dead code but env vars are documented as the active WhatsApp provider.** The active sender is `src/lib/whatsapp.ts` (Meta Cloud API). The two registries are out of sync. — Phase 2 — `src/lib/twilio.ts`, `.env.local.example`
2. **OTP send route returns `{ success: true }` without verifying WhatsApp delivery.** Failed sends still tick the rate limiter and mislead the user. — Phase 2 — `src/app/api/client-auth/send-otp/route.ts:78-84`
3. **Stripe webhook silently ignores `invoice.payment_failed`.** Failed renewals produce no PT notification and no subscription-state change. — Phase 2/3 — `src/app/api/webhooks/stripe/route.ts:23-48`
4. **Client portal nutrition log is broken for client users.** `POST /api/nutrition/log` requires a Supabase auth session, but client users authenticate via OTP token in localStorage — the call will 401 for every client. — Phase 3 — `src/app/(client)/client/nutrition/page.tsx:163-179`
5. **Nutrition page triggers `supabase.auth.getUser()` in render body.** Side-effect-in-render, causes repeated auth calls and unsafe state updates. — Phase 3 — `src/app/(dashboard)/nutrition/page.tsx:39-43`
6. **Cron trigger 3 (new-pending-booking notify) has no idempotency flag.** Overlapping 30-min runs re-notify the PT. Violates `check return before flag` principle from MEMORY.md. — Phase 3 — `src/app/api/reminders/route.ts:131-169`
7. **No rate limiting on `/api/nutrition/analyse`.** Direct Anthropic API spend amplification vector. — Phase 4 — `src/app/api/nutrition/analyse/route.ts`
8. **No rate limiting on `/api/session/upload-payment-proof`.** Token-holder can exhaust storage. — Phase 4 — `src/app/api/session/upload-payment-proof/route.ts`
9. **`booking_approvals` RLS policy uses bare `auth.uid()` instead of `(SELECT auth.uid())`.** Per-row function evaluation on every policy check — noticeable perf hit as the table grows. — Phase 1 — `supabase/schema.sql:371`
10. **`whatsapp_logs` has a SELECT policy but no INSERT/UPDATE policies.** If service-role RLS-bypass is ever tightened, cron inserts silently fail. — Phase 1 — `supabase/schema.sql:594`
11. **`nutrition_logs` has no UPDATE or DELETE policies.** PTs cannot correct a log entry through the app without a clear error path. — Phase 1 — `20260420_phase_m_hardening.sql`
12. **`ANTHROPIC_API_KEY` undocumented.** See CRITICAL #6 — calling this out separately since it blocks the nutrition feature. — Phase 1 — `.env.local.example`
13. **Hardcoded hex codes (~20 instances) bypass the Tailwind v4 theme.** Brand palette updates will drift — `fitdesk-logo.tsx`, `phone-mockup.tsx`, `payment-status-card.tsx`, `input.tsx`. — Phase 5
14. **No real logo asset.** Only `public/logo-placeholder.txt` and a procedural SVG component exist. — Phase 5 — `public/`
15. **No customer support channel.** No `support@`, no contact form, no chat widget, no `mailto:` anywhere in app or public pages. — Phase 6
16. **No monitoring / alerting strategy.** No uptime, Speed Insights, Web Vitals, or on-call doc. — Phase 6
17. **`/api/checkout` uses `customer_email` instead of linking `profiles.stripe_customer_id`.** Second upgrade creates a duplicate Stripe customer and can break the `customer.subscription.deleted` lookup. — Phase 2 — `src/app/api/checkout/route.ts`
18. **CSRF silently becomes a no-op when `NEXT_PUBLIC_APP_URL` is unset.** A misconfigured deploy turns off CSRF with no error or log. — Phase 4 — `src/lib/csrf.ts:15`

### MEDIUM Priority Issues (fix before beta ends)

1. `/onboarding` is listed as a public route in middleware — accessible without session. — Phase 2 — `src/lib/supabase/middleware.ts:42`
2. No app-level rate limiting on `/login` and `/signup`. Relies entirely on Supabase defaults. — Phase 2
3. OTP verify TOCTOU window — `bcrypt.compare` runs before `UPDATE used_at`. Concurrent requests can accept the same OTP twice. — Phase 2 — `src/app/api/client-auth/verify-otp/route.ts:48-55`
4. Synthetic-password race during OTP verify: `updateUserById` then `signInWithPassword` has a narrow window that risks sign-in flakiness. — Phase 2 — `verify-otp/route.ts:118-120`
5. WhatsApp opt-out is not enforced in cron. All 14 `sendTemplateMessage` calls pass `clientId` and `trainerId` as `undefined`, which bypasses suppression. — Phase 2 — `src/app/api/reminders/route.ts`
6. Template name mismatch: cron sends `payment_overdue_1/3` but label map uses `payment_overdue_day_1/3/7`. Garbled log display. — Phase 2 — `src/lib/whatsapp-template-labels.ts` vs `reminders/route.ts:269,309`
7. `ai_raw_response` accepted from client body unsanitised and stored; unbounded length; stored-XSS risk if ever rendered as HTML. — Phase 2 — `src/app/api/nutrition/log/route.ts:13`, `analyse/route.ts:136`
8. Meal images uploaded to the `avatars` bucket under `meals/` path — wrong bucket, public avatars policies apply. — Phase 2 — `analyse/route.ts:57`
9. Reschedule via `/api/bookings/[id]/action` sets session-token `expires_at = session start time` — token dies at session start, unusable during or after. — Phase 3 — `action/route.ts:224-227`
10. `bulk-cancel` restore action cancels bookings but never decrements `package.sessions_used`, silently leaking sessions (single-booking restore path handles this correctly). — Phase 3 — `bulk-cancel/route.ts:65`
11. Profile page uses raw `useEffect + createClient` instead of a TanStack Query hook (violates CLAUDE.md convention; no `useProfile`). — Phase 3 — `src/app/(dashboard)/profile/page.tsx:34-58`
12. `copy-week` timezone mismatch between UTC-ISO conflict set and SGT-offset source data — dedup never matches, all bookings re-created. — Phase 3 — `copy-week/route.ts:74-77`
13. Client portal payments page queries `payments` directly via anon client with no error handling — silent failures render as empty list. — Phase 3 — `src/app/(client)/client/payments/page.tsx:34-45`
14. Lapsed-client trigger relies on post-query guard rather than `is not null` at query level. — Phase 3 — `reminders/route.ts:499-500`
15. Cron trigger 3 looks back only 35 min for 30-min schedule — no slack for clock drift / cold start delays. — Phase 3 — `reminders/route.ts:134`
16. `pt_working_hours` and `pt_blocked_slots` have `USING (true)` for public SELECT — exposes blocked/personal time. — Phase 1 — `schema.sql:493-496, 514-517`
17. Schema drift: `idx_bookings_client` and `idx_payments_due_date` exist only as inline migrations after base `CREATE TABLE`. Fresh envs applying `schema.sql` alone miss them initially. — Phase 1 — `schema.sql:336-337`
18. Only `avatars` storage bucket exists — no dedicated bucket for nutrition photos or payment proofs. — Phase 1
19. `.env.local.example` documents Meta WhatsApp vars while code uses Twilio in places — contradictory developer onboarding. — Phase 1
20. CSRF check absent on most mutating authenticated routes (`/api/bookings/[id]/action`, `/payment`, `/approve`, `/cancel`, etc.). Only 4 routes call `checkCsrf`. — Phase 4 — `src/lib/csrf.ts`
21. OTP send route does not call `checkRateLimit` (only DB-level 3-per-10-min per number). No IP-distributed protection. — Phase 4 — `send-otp/route.ts`
22. `error.message` returned directly in 500 responses for both nutrition routes — leaks DB/Anthropic internals. — Phase 4 — `log/route.ts:76`, `analyse/route.ts:140`
23. `console.warn` in `src/app/api/bookings/route.ts:127,168` — violates no-console production rule. — Phase 4
24. Instagram URL guarded only by `startsWith("https://")` — allows `https://instagram.com@evil.com/` open-redirect shape. — Phase 4 — `src/app/book/[slug]/page.tsx:121`
25. Profile details form renders Instagram `href` without `safeExternalHref` helper. — Phase 4 — `profile-details-form.tsx:149`
26. Empty-state rollout incomplete across some list pages per `docs/empty-states.md`. — Phase 5
27. No inline form-error component; forms rely on `toast.error()` with no field-level error messages. — Phase 5
28. No contact info on public booking page, landing page, or auth pages. — Phase 6
29. No monitoring/alert thresholds or on-call docs in `docs/`. — Phase 6
30. `session_tokens` RLS uses `USING (false) WITH CHECK (false)` — likely intentional (service-role only) but undocumented. — Phase 1 — `schema.sql:356`

### LOW Priority Issues (nice to have)

1. `profiles.booking_slug` unbounded `text` with no `CHECK` length constraint. — Phase 1
2. `schema.sql` doubles as base schema + migration journal; duplicate index creation risk on fresh envs. — Phase 1
3. `avatars` bucket `public = true` — profile photos publicly enumerable. — Phase 1
4. Vercel cron every 30min requires Pro plan; Hobby will silently not run. — Phase 1 — `vercel.json`
5. `fitdesk_client_otp` template missing from both Twilio `CONTENT_SID_MAP` and label map. — Phase 2
6. `file.name` sanitisation in Supabase storage path — harmless today but worth noting. — Phase 2 — `analyse/route.ts:53`
7. `TestimonialPlaceholder` stub component rendered on public `/welcome`. — Phase 3 — `src/components/landing/testimonial-placeholder.tsx`
8. TODO comment without ticket in `phone-mockup.tsx:11`. — Phase 3
9. `console.warn` in bookings API (dup of MEDIUM #23, listed here for completeness). — Phase 3
10. Zod validation errors returned with full `parsed.error.issues` on public `/api/bookings`. — Phase 4
11. Hardcoded `.jpg` extension on payment-proof storage path regardless of actual MIME. — Phase 4 — `upload-payment-proof/route.ts`
12. `console.error` in `src/lib/whatsapp.ts:73,112` — library-level but production path. — Phase 4
13. `console.error` in `error-boundary.tsx:30` — acceptable in boundary but should route through structured logger. — Phase 4
14. No `motion-safe:` variants on some component transitions (beyond audited payment-status-card). — Phase 5
15. Hero headline uses raw `text-4xl/text-5xl` outside locked type scale (documented exception). — Phase 5 — `hero.tsx:20`
16. No step-counter / progress indicator in onboarding beyond `"Step 1 of 2"` text. — Phase 5 — `onboarding/page.tsx:119`
17. `Twilio Recovery code.txt` lives in project root on disk (gitignored) — operational hygiene risk. — Phase 4

---

## UX Scorecard (Phase 5)

| Area | Score |
|---|---|
| Logo & Branding | 4/10 ❌ |
| Mobile 390px | 8/10 ✅ |
| Empty states | 8/10 ✅ |
| Loading states | 8/10 ✅ |
| Error states | 7/10 ✅ |
| Onboarding flow | 9/10 ✅ |
| Animations & reduced-motion | 9/10 ✅ |
| Typography consistency | 9/10 ✅ |
| Color consistency | 6/10 ❌ |

Flagged: **Logo & Branding** and **Color consistency** both below 7/10.

---

## Monitoring/Support Readiness (Phase 6)

| Item | Status |
|---|---|
| Error tracking (Sentry etc.) | ❌ MISSING |
| Web analytics (`@vercel/analytics`) | ✅ PRESENT |
| Monitoring/alerting strategy doc | ❌ MISSING |
| Customer support channel | ❌ MISSING |
| Terms of Service page | ❌ MISSING |
| Privacy Policy page | ❌ MISSING |
| Contact info on public pages | ❌ MISSING |
| `error.tsx` / `not-found.tsx` | ❌ MISSING |

---

## Next Steps — Recommended Tackling Order

**Gate 1 — Block launch (tackle this week)**
1. Ship Privacy Policy + ToS pages (CRITICAL #2, #3). Required for Meta WhatsApp & Stripe reviews.
2. Fix Stripe webhook authorization (CRITICAL #1). Add `stripe_customer_id` match check and require metadata.user_id to exist in profiles.
3. Add `error.tsx`, `not-found.tsx`, `global-error.tsx` with branded recovery + support link (CRITICAL #5).
4. Wire Sentry (or equivalent) for server + client error capture (CRITICAL #4).
5. Reconcile `.env.local.example` — remove Meta vars or Twilio vars to match the single active provider, add `ANTHROPIC_API_KEY`, document `CRON_SECRET` clearly (CRITICAL #6).

**Gate 2 — Fix before PT beta (next 2 weeks)**
6. Delete `src/lib/twilio.ts` or switch provider (HIGH #1).
7. Fix client-portal nutrition log path (HIGH #4) — use client-identity token, not Supabase auth.
8. Fix nutrition page render-body side effect (HIGH #5).
9. Handle `invoice.payment_failed` event in Stripe webhook (HIGH #3).
10. Rate-limit `/api/nutrition/analyse` and `/api/session/upload-payment-proof` (HIGH #7, #8).
11. Add idempotency flag to cron trigger 3 (HIGH #6).
12. Verify OTP send before returning success (HIGH #2).
13. Ship a real logo asset + purge hardcoded hex codes (HIGH #13, #14).
14. Add support channel — `support@` email + mailto in footer + 404 page (HIGH #15).

**Gate 3 — Close before $19 paywall flips**
15. Work through MEDIUM list in order (timezone bug in `copy-week`, bulk-cancel session restore, profile page hook, CSRF rollout, error-message sanitisation).
16. Resolve schema drift by merging inline migrations back into base `schema.sql`.
17. Scope blocked slots/working hours to authenticated or tokenised reads.

**Gate 4 — LOW-priority cleanup**
18. Zod error filtering on public routes.
19. Console-log cleanup sweep.
20. Extension-preserving file uploads.
21. Rotate and move `Twilio Recovery code.txt` out of project dir.

---

*Generated by 6-phase audit pipeline (database-reviewer, security-reviewer, code-reviewer, Explore agents). All findings reported without code modification per audit scope.*
