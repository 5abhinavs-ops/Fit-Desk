# FitDesk

Mobile-first SaaS for personal trainers in Southeast Asia. Replaces WhatsApp + Excel + generic invoicing with client management, packages, bookings, payments, and WhatsApp-automated reminders.

**Target:** $10K MRR (~526 PTs at $19/month)

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Database + Auth:** Supabase (PostgreSQL + RLS + Auth)
- **Payments:** Stripe (subscriptions + one-time deposits)
- **WhatsApp:** Twilio WhatsApp API (Content SIDs)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Data fetching:** TanStack Query v5
- **Testing:** Vitest
- **Deployment:** Vercel (with cron jobs)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in all values (see Environment Variables below)

# Start dev server
npm run dev
```

Open http://localhost:3000.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (server-only)
STRIPE_SECRET_KEY=                # Stripe secret key
STRIPE_WEBHOOK_SECRET=            # Stripe webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key
STRIPE_PRO_PRICE_MONTHLY_ID=     # Stripe price ID for $19/mo
STRIPE_PRO_PRICE_YEARLY_ID=      # Stripe price ID for $190/yr
WATI_API_URL=                     # WATI/Twilio WhatsApp API URL
WATI_API_TOKEN=                   # WATI/Twilio API token
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=                      # Secret for Vercel cron auth
```

## Database Setup

Run `supabase/schema.sql` in the Supabase SQL Editor. This creates all tables, RLS policies, indexes, triggers, and the `increment_sessions_used` RPC.

After initial setup, run the migration statements at the bottom of the schema file.

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests (Vitest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Project Structure

```
src/
  app/
    (auth)/          Login + Signup pages
    (dashboard)/     All authenticated screens (5-tab bottom nav)
    api/             API routes (bookings, reminders, checkout, webhooks)
    book/[slug]/     Public client booking page
    onboarding/      Post-signup onboarding
    upgrade/         Stripe subscription checkout
  components/
    clients/         Client management sheets (add, book, package, payment)
    shared/          Bottom navigation
    ui/              shadcn/ui components
  hooks/             TanStack Query hooks (clients, bookings, packages, payments, dashboard)
  lib/               Utilities (Supabase clients, Stripe, WATI, formatting)
  types/             TypeScript interfaces and type definitions
supabase/
  schema.sql         Full database schema with RLS policies
```

## Key Architecture Decisions

- **Three Supabase clients:** Browser (anon + RLS), Server (cookies), Service (bypasses RLS for cron/public APIs)
- **`sessions_used` not `sessions_remaining`:** Simpler increment logic, calculated at query time
- **`pay_later` as default:** 90% of SEA PTs collect cash/PayNow. Forcing Stripe kills adoption.
- **Soft paywall:** Free users can read all data but are blocked from creating > 3 clients
- **WhatsApp over email:** SEA market reads WhatsApp. Email is ignored.
