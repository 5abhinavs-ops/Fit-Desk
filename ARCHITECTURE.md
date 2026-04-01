# FitDesk Architecture

## Supabase Client Strategy

FitDesk uses three distinct Supabase clients. This is intentional — do not consolidate.

| Client | File | Auth | RLS | Used In |
|--------|------|------|-----|---------|
| Browser | `lib/supabase/client.ts` | Anon key + RLS | Yes | React hooks, client components |
| Server | `lib/supabase/server.ts` | Cookie session | Yes | Authenticated API routes |
| Service | `lib/supabase/service.ts` | Service role key | Bypassed | Cron jobs, public booking API, webhooks |

**When to use which:**
- Browser client: Any client-side data fetching (hooks)
- Server client: API routes where the user is authenticated (checkout, portal, manual reminder)
- Service client: Routes with no user session (Stripe webhooks, Vercel cron, public booking page)

## Authentication Flow

1. User signs up via `/signup` → Supabase Auth creates user
2. `handle_new_user()` trigger auto-creates a `profiles` row
3. Middleware (`src/middleware.ts` + `lib/supabase/middleware.ts`) refreshes session cookies
4. Unauthenticated users are redirected to `/login` (except public routes)

**Public routes (no auth required):**
- `/login`, `/signup` — Auth pages
- `/book/[slug]` — Public booking page
- `/onboarding` — Post-signup flow
- `/upgrade`, `/upgrade/success` — Stripe checkout

## Data Flow

### Booking Flow (Public)
```
Client visits /book/[slug]
  → Server renders trainer profile (service client, safe columns only)
  → Client selects date → GET /api/availability (service client)
  → Client submits form → POST /api/bookings (service client)
    → Validates trainer_id exists
    → Upserts client by WhatsApp number
    → Creates booking with status "pending"
```

### Payment Reminder Flow (Cron)
```
Vercel cron (every 30 min) → GET /api/reminders
  → Authenticates via x-cron-secret header
  → Runs 8 triggers sequentially:
    1. 24h session reminder
    2. 1h session reminder
    3. New booking notification to trainer
    4. Package low sessions alert
    5. Payment due today
    6. Overdue day 1 (sets status to "overdue")
    7. Overdue day 3
    8. Overdue day 7 + auto-pause client
  → Each item has its own try/catch
  → sendTemplateMessage return checked before updating flags
```

### Stripe Subscription Flow
```
PT clicks Upgrade → POST /api/checkout → Stripe Checkout
  → Payment succeeds → Stripe webhook
  → POST /api/webhooks/stripe (service client)
    → checkout.session.completed → set subscription_plan = "pro"
    → customer.subscription.deleted → set subscription_plan = "free"
    → customer.subscription.updated → sync status
```

## Database Schema

6 tables, all with RLS enabled:

| Table | Purpose | Key RLS Rule |
|-------|---------|-------------|
| profiles | Trainer accounts (extends auth.users) | Own profile only; no public SELECT |
| clients | Client records | trainer_id = auth.uid() |
| packages | Pre-paid session packages | trainer_id = auth.uid() |
| sessions | Completed session logs | trainer_id = auth.uid() |
| bookings | Future scheduled sessions | trainer_id = auth.uid() + public INSERT for client_link |
| payments | Payment tracking with overdue stages | trainer_id = auth.uid() |

**Key RPC:** `increment_sessions_used(p_package_id)` — Atomic session increment to prevent race conditions.

## Security Boundaries

- Profiles RLS: No blanket public SELECT. Public reads handled via service client with explicit column selection.
- Instagram URLs: `https://` scheme enforced client-side and at render time on both profile and public booking pages.
- Stripe webhooks: Signature verified via `constructEvent()`, uses service client.
- Cron: Authenticated via `CRON_SECRET` header.
- All mutations rely on Supabase RLS as primary access control.
