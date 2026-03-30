# FitDesk — Phase 1 Autonomous Build Plan

> **HOW TO USE THIS FILE**
> Open terminal in the FitDesk project root and run:
> ```
> claude "Read BUILD.md and execute every step in order. Do not stop between steps unless a TypeScript error or build error occurs that you cannot fix. After each step, run npx tsc --noEmit and fix any errors before proceeding to the next step. Complete all steps in one session."
> ```
> Claude Code will read this file, plan each step using the planner agent, build it, verify it, and move to the next — fully automatically.

---

## If you are resuming a stuck or interrupted session

Run this to check what is already built:
```bash
grep -r "Phase 1, Feature" src/app --include="*.tsx" -l
```
Any file that still contains the text "Phase 1, Feature" is NOT done — it is a stub.
Check each step's output files listed below to determine what is complete.
Skip completed steps. Start from the first incomplete step.

**If you are stuck on a specific sub-step and cannot fix it after 3 attempts:**
- Add a `// TODO: fix [describe the issue]` comment in the file
- Move immediately to the next sub-step or next Step
- Do NOT stop the entire build because of one stuck sub-step
- Log the skipped item and continue

**Step completion checklist — check these files to know what is done:**
- Step 1 done: `src/app/(auth)/login/page.tsx` has a real form (not a comment stub)
- Step 2 done: `src/app/(dashboard)/page.tsx` imports `useDashboard`
- Step 3 done: `src/components/clients/ClientCard.tsx` exists
- Step 4 done: `src/components/clients/CreatePackageSheet.tsx` exists
- Step 5 done: `src/components/clients/CreateBookingSheet.tsx` exists
- Step 6 done: `src/hooks/usePayments.ts` exists
- Step 7 done: `src/app/api/reminders/route.ts` has real trigger logic (not a stub)
- Step 8 done: `src/app/upgrade/page.tsx` exists
- Step 9 done: `src/app/api/bookings/route.ts` has Zod validation
- Step 10 done: `src/app/(dashboard)/profile/page.tsx` exists
- Step 11 done: `npm run build` passes with zero errors

---

## Pre-flight checklist

Before starting Step 1, do ALL of these:

1. Read `CLAUDE.md` fully — this is your identity, project context, and non-negotiables
2. Read `AGENTS.md` fully — this is your operating rules
3. Read `src/types/database.ts` — memorise every type and interface
4. Read `supabase/schema.sql` — memorise the full database schema
5. Read `src/hooks/useDashboard.ts`, `useClients.ts`, `useBookings.ts`, `usePackages.ts` — these hooks exist, do NOT recreate them
6. Read `src/components/shared/bottom-nav.tsx` — this is the nav, modify only when instructed
7. Read `src/app/layout.tsx` — QueryProvider and Toaster are already wired
8. Confirm these shadcn components exist in `src/components/ui/`: button, card, input, label, badge, sheet, skeleton, dialog, select, textarea, avatar, progress, calendar, popover, tabs, separator, sonner — use ONLY these, install nothing new
9. Run `npm run build` — confirm the project currently builds with zero errors before writing a single line

Only proceed to Step 1 after all 9 pre-flight checks pass.

---

## Step 1 — Authentication + Onboarding

**Goal:** A PT can sign up, log in, and complete their profile before accessing the dashboard.

**Identity check:** Would a PT bother finishing signup if it has too many fields? No. Keep it lean.

### 1A — Login page
File: `src/app/(auth)/login/page.tsx`

Replace the stub. Build a real login form:
- FitDesk logo/name at top (text, no image needed yet)
- Email field (`Input` component, type="email", label="Email")
- Password field (`Input` component, type="password", label="Password")
- "Sign in" button (`Button` component, full width, shows spinner when loading)
- "Don't have an account? Sign up" link to `/signup`
- Form submission:
  - Call `supabase.auth.signInWithPassword({ email, password })`
  - On success: `router.push('/')`
  - On error: `toast.error(error.message)` via sonner
- Use `useState` for loading state, not a form library (keep it simple)
- Mobile: `max-w-sm`, centred, `p-4`

### 1B — Signup page
File: `src/app/(auth)/signup/page.tsx`

Replace the stub. Build signup form:
- Fields (in order):
  - Full name (required)
  - WhatsApp number (required, placeholder "+65 9123 4567")  
  - Email (required)
  - Password (required, min 8 chars)
- "Create account" button (full width, loading state)
- "Already have an account? Sign in" link to `/login`
- Form submission:
  - Call `supabase.auth.signUp({ email, password, options: { data: { name, whatsapp_number } } })`
  - The `handle_new_user` database trigger will auto-create the profiles row using this metadata
  - On success: `router.push('/onboarding')`
  - On error: `toast.error(error.message)`

### 1C — Onboarding page (NEW)
File: `src/app/onboarding/page.tsx`

Shown once after signup. Completes the trainer profile:
- Title: "Set up your FitDesk profile"
- Subtitle: "Takes 60 seconds. You can change this later."
- Fields:
  - PayNow number or UEN (Input, placeholder "9123 4567 or T12ABC123D", label "PayNow number", helper text "Used in payment reminder messages to clients")
  - Default payment mode (Select):
    - "Pay later — cash, PayNow or bank transfer" (value: `pay_later`, DEFAULT selected)
    - "Pay now — Stripe card payment at booking" (value: `pay_now`)
    - "From session package" (value: `from_package`)
  - Booking link slug (Input, pre-filled with slugified name from auth metadata, editable, lowercase only, no spaces)
  - Below slug field: small text showing "Your booking link: fitdesk.app/book/[slug]" — updates live as they type
- "Let's go" button (full width, loading state)
- On submit:
  - Get the current user's profile id from `supabase.auth.getUser()`
  - UPDATE profiles SET paynow_details, default_booking_payment_mode, booking_slug WHERE id = user.id
  - On success: `router.push('/')`
  - On error: `toast.error(error.message)`
- This page should only be accessible when logged in — middleware handles this

### 1D — Verify middleware
File: `src/middleware.ts`

Open and verify (do NOT rewrite unless broken) that it:
- Redirects unauthenticated requests to `/`, `/clients`, `/bookings`, `/payments`, `/profile` → redirect to `/login`
- Redirects authenticated requests to `/login`, `/signup` → redirect to `/`
- Does NOT block `/book/*` (public booking pages)
- Does NOT block `/api/*` routes
- Does NOT block `/onboarding`
- Does NOT block `/upgrade`, `/upgrade/success`

If middleware is incorrect, fix it. If correct, leave it untouched.

### 1E — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Manually verify: can you see the login page at localhost:3000/login? Does the form render on mobile width?

---

## Step 2 — Dashboard home screen

**Goal:** When a PT opens the app, they immediately know: how many sessions today, who owes money, who needs to renew.

**Identity check:** A PT between sessions has 2 minutes. This screen must answer their 3 questions instantly.

### 2A — Dashboard page
File: `src/app/(dashboard)/page.tsx`

Replace the stub completely. Use the `useDashboard` hook (already built — import from `@/hooks/useDashboard`).

**Greeting section:**
- Fetch trainer name: `const { data: { user } } = await supabase.auth.getUser()` — use `user.user_metadata.name`
- Time-based greeting: before 12 = "Good morning", 12–17 = "Good afternoon", after 17 = "Good evening"
- Format: "Good morning, James 👋"
- Today's date below: "Thursday, 27 March 2025"

**Three stat cards:**
Use `Card` component from `@/components/ui/card`.

Card 1 — Today's sessions:
- Label: "Today's sessions" (small, muted)
- Value: `todayBookingsCount` (large number, 32px, bold)
- Entire card is tappable → `router.push('/bookings')`

Card 2 — Outstanding payments:
- Label: "Outstanding"
- Value: formatted as "$1,450" (use `Intl.NumberFormat` for currency — never raw `.toFixed`)
- Tappable → `router.push('/payments')`

Card 3 — Low sessions (full width, below the 2-col row):
- Label: "Renew soon"
- Value: count of `lowSessionClients`
- Only render this card if `lowSessionClients.length > 0`
- Tappable → scrolls to the list below

**Grid layout:** Cards 1 and 2 side by side (`grid grid-cols-2 gap-3`), Card 3 full width below.

**Loading state:**
When `isLoading === true`, show `Skeleton` components in the same layout:
- Two skeleton cards side by side (same height as real cards)
- One full-width skeleton below

**Error state:**
If `isError`, show: "Could not load dashboard. Pull to refresh." (simple text, no crash)

**Low session clients list:**
Below the cards, only if `lowSessionClients.length > 0`:
- Section title: "Renew soon" (small heading)
- Each row:
  - Avatar with initials (first + last name initial, use `Avatar` component)
  - Client name (bold)
  - `Badge`: "1 session left" (variant destructive/red if 1) or "2 sessions left" (amber/warning if 2)
  - Entire row tappable → `router.push('/clients/' + client_id)`
- Skeleton: 2 rows while loading

### 2B — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the dashboard render with skeleton before data loads?
- Does it show the greeting correctly?

---

## Step 3 — Client list + Add client + Paywall

**Goal:** PT can see all their clients, find one fast, and add a new one. Free-tier PTs hit the paywall at client #4.

**Identity check:** A PT adds a new client by asking them for their WhatsApp number first. That's field #1.

### 3A — Clients page
File: `src/app/(dashboard)/clients/page.tsx`

Replace the stub. Use `useClients` hook (already built — import from `@/hooks/useClients`).

Layout:
- Header row: "Clients" (h1) + client count badge on the right (e.g. `12`)
- Search bar: `Input` with search icon, placeholder "Search clients..."
  - Filters `data` array client-side by `first_name + last_name` match (case-insensitive, no new query)
- Filter pills row (horizontal scroll if needed):
  - "All" | "Active" | "Paused" | "Inactive"
  - Active pill is highlighted (primary colour), others are outline
  - Filters the displayed list
- Client list (filtered result of search + status filter):
  - Each item: `ClientCard` component (build below)
  - Empty state: "No clients match your search" or "No clients yet. Tap + to add your first."
- Skeleton: 5 `ClientCard` skeletons while `isLoading`
- FAB (floating action button): fixed bottom-right, above bottom nav
  - Circle button, "+" icon, primary background
  - Tap → open `AddClientSheet`

### 3B — ClientCard component
File: `src/components/clients/ClientCard.tsx`

Props: `client: Client` (import type from `@/types/database`)

Layout (full-width row, border-bottom separator):
- Left: `Avatar` with initials (e.g. "JT" for James Tan)
- Centre: full name (bold, 15px), WhatsApp number (muted, 13px below)
- Right: status `Badge`:
  - active → green (use `bg-green-100 text-green-800` or similar)
  - paused → amber
  - inactive → gray
- Entire row tappable → `router.push('/clients/' + client.id)`
- Add `cursor-pointer` and subtle hover state

### 3C — AddClientSheet component
File: `src/components/clients/AddClientSheet.tsx`

Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

Use `Sheet` component (slides from bottom — set `side="bottom"`).

Fields (in this order, use `Input` + `Label` for each):
1. First name * (required)
2. Last name * (required)
3. WhatsApp number * (required, placeholder "+65 9123 4567")
4. Email (optional)
5. Goals (optional, `Textarea`, placeholder "Weight loss, muscle building...")
6. Injuries / Medical notes (optional, `Textarea`, placeholder "Bad knees, lower back pain...")

Buttons (bottom of sheet, sticky):
- "Cancel" (outline, closes sheet)
- "Add client" (primary, full width, loading state while mutating)

**Paywall logic (CRITICAL — this is how we earn money):**
Before calling `useCreateClient` mutation, check:
```
if (subscriptionPlan === 'free' && existingClientCount >= 3) {
  // Do NOT call the mutation
  // Close the sheet
  // Open the upgrade dialog
}
```
To get `subscriptionPlan`: fetch from `supabase.auth.getUser()` → then query profiles table for `subscription_plan`.
To get `existingClientCount`: use `data?.length` from `useClients()`.

**Upgrade dialog** (show instead of adding when paywall hit):
Use `Dialog` component:
- Title: "Upgrade to Pro"
- Body: "You've reached the 3-client limit on the free plan. Upgrade to Pro for unlimited clients, WhatsApp reminders, and full payment tracking — $19/month."
- Button 1: "Upgrade to Pro" (primary) → `router.push('/upgrade')`
- Button 2: "Not now" (outline) → closes dialog

**On successful add:**
- `toast.success('Client added')`
- Sheet closes
- TanStack Query auto-invalidates — list refreshes

### 3D — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does search filter work client-side?
- Does the status filter work?
- Does the paywall dialog appear when a free user tries to add client #4?

---

## Step 4 — Client detail page + Package creation

**Goal:** PT taps a client and sees everything: who they are, how many sessions they have left, what they owe.

**Identity check:** Between sessions a PT needs to check "how many sessions does Marcus have left?" in under 3 taps.

### 4A — Client detail page
File: `src/app/(dashboard)/clients/[id]/page.tsx`

Use `useClient(id)` and `usePackages(id)` hooks.
Get `id` from `params` (use `use(params)` for Next.js 15 async params).

Layout (scrollable, single column):

**Hero section:**
- Back button "← Clients" top left
- Large avatar with initials (48px circle)
- Full name (bold, 20px)
- Status badge (active/paused/inactive)
- Status tap to toggle: active → paused → inactive → active (update Supabase immediately, optimistic)

**Contact section:**
- "WhatsApp" button → opens `https://wa.me/${whatsapp_number.replace(/\D/g, '')}`
- "Email" button (only if email exists) → opens `mailto:${email}`
- Both buttons: outline style, icon + text

**Info section (collapsible if long):**
- Goals: show if populated, else "Not set"
- Injuries / Medical: show if populated, else "None recorded"
- Emergency contact: show if name + phone populated

**Active package card:**
Query `usePackages(id)` and find the first package with `status === 'active'`.

If active package exists:
- Package name (bold)
- Progress bar: `Progress` component showing `sessions_used / total_sessions * 100`
- Text: "8 of 10 sessions used — 2 remaining"
- Payment badge: "Paid" (green) / "Partial" (amber) / "Unpaid" (red)
- "Mark session done" button:
  - Calls `useLogSession(package.id)` mutation
  - Disabled + grayed out when `sessions_used >= total_sessions`
  - Shows loading state while mutating
  - On success: `toast.success('Session logged — 1 session deducted')`
  - When this hits the last session: `toast.success('Package complete!')` — the hook auto-updates status to "completed"

If no active package:
- Gray card: "No active package"
- "Create package" button → opens `CreatePackageSheet`

**"Create package" button also shows below the active package** (for adding a new one after current expires).

### 4B — Create package sheet
File: `src/components/clients/CreatePackageSheet.tsx`

Props: `clientId: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`

Add `useCreatePackage` mutation to `src/hooks/usePackages.ts`:
```typescript
export function useCreatePackage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (pkg: Omit<Package, 'id' | 'trainer_id' | 'created_at' | 'sessions_used' | 'amount_paid' | 'payment_status' | 'status'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('packages').insert({
        ...pkg,
        trainer_id: user!.id,
        sessions_used: 0,
        amount_paid: 0,
        payment_status: 'unpaid',
        status: 'active',
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['packages', variables.client_id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

Sheet fields:
1. Package name (Input, placeholder "10-session PT pack")
2. Total sessions (Input type="number", min=1, default=10)
3. Price (Input type="number", prefix="$", placeholder="500")
4. Payment mode (Select):
   - "Pay later — cash / PayNow / transfer" (default)
   - "Pay now via Stripe card"
   - "Pre-paid / from package"
5. Start date (default today — use a simple date input `type="date"` for now, not the calendar component)
6. Expiry date (optional, `type="date"`)

"Create package" button — calls `useCreatePackage`.
On success: `toast.success('Package created')`, close sheet.

### 4C — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Can you navigate to a client detail page?
- Does the session counter decrement correctly?
- Does the package creation form work?

---

## Step 5 — Bookings calendar + Create booking + Session management

**Goal:** PT sees the week at a glance, books a session in under 5 taps, and marks it done with one tap.

**Identity check:** At 6:55am before a 7am session, the PT needs to pull up the booking in 2 seconds.

### 5A — New hooks
Add to `src/hooks/useBookings.ts`:

```typescript
export function useCreateBooking() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (booking: Omit<Booking, 'id' | 'trainer_id' | 'created_at' | 'reminder_24h_sent' | 'reminder_1h_sent'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('bookings').insert({
        ...booking,
        trainer_id: user!.id,
        reminder_24h_sent: false,
        reminder_1h_sent: false,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateBookingStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

### 5B — Bookings page
File: `src/app/(dashboard)/bookings/page.tsx`

Replace the stub.

**State:**
- `selectedDate`: string (YYYY-MM-DD), default today

**Week strip:**
- Show 7 days: 3 before today, today, 3 after today (a rolling 7-day window)
- Each day: abbreviated weekday above ("Mon"), date number below ("27")
- Selected day: primary background pill
- Today: dot indicator below the number
- Horizontal scroll if needed
- Tap to change `selectedDate`

**Booking list:**
- Use `useBookings(selectedDate)` — already built, accepts a date string
- Each booking row:
  - Left: time (e.g. "9:00 AM"), formatted from `date_time`
  - Centre: client name (bold), duration ("60 min"), location (muted, if exists)
  - Right: session type badge ("1-on-1", "Group", "Assessment")
  - Status indicator: green dot (confirmed), amber dot (pending), gray (cancelled), red (no-show)
  - Tap row → open `BookingActionSheet`
- Empty state: "No sessions on [day name]. Tap + to book."
- Skeleton: 3 row skeletons while loading

**FAB "+" button:** opens `CreateBookingSheet`

### 5C — BookingActionSheet component
File: `src/components/clients/BookingActionSheet.tsx`

Props: `booking: Booking`, `open: boolean`, `onOpenChange: (open: boolean) => void`

Use `Sheet` (side="bottom").

Shows:
- Client name + time + location
- Current status badge

Action buttons (only for bookings with status "confirmed" or "pending" and date_time in the future or within 2h of now):
- "Mark complete" (green) → `useUpdateBookingStatus({ id, status: 'completed' })` AND if `booking.package_id` exists → also call `useLogSession(booking.package_id)`. Show toast "Session marked complete".
- "Cancel session" (outline) → `useUpdateBookingStatus({ id, status: 'cancelled' })`. Toast "Session cancelled".
- "No-show" (red outline) → `useUpdateBookingStatus({ id, status: 'no-show' })`. Toast "Marked as no-show".

For past/completed bookings: show "This session is complete" message, no action buttons.

### 5D — CreateBookingSheet component
File: `src/components/clients/CreateBookingSheet.tsx`

Props: `defaultDate: string`, `open: boolean`, `onOpenChange: (open: boolean) => void`

Use `Sheet` (side="bottom"), tall enough to show all fields.

Fields:
1. Client (Select — use `useClients()` to populate options, show client name)
2. Date (Input type="date", default: `defaultDate`)
3. Time (Select — options from "06:00" to "21:00" in 30-min increments, show as "6:00 AM", "6:30 AM" etc.)
4. Duration (Select: "30 min", "45 min", "60 min", "90 min", "120 min")
5. Session type (Select: "1-on-1", "Group", "Assessment")
6. Location (Input, optional, placeholder "ActiveSG Jurong, Client's condo gym...")
7. Payment mode (Select: "Pay later", "Pay now (Stripe)", "From package"):
   - Default: trainer's `profile.default_booking_payment_mode` — fetch this from profiles
   - If "From package": show the selected client's active package info (sessions remaining)
   - If "Pay later": show optional "Due date" date input
8. Notes for client (Textarea, optional)

"Book session" button → calls `useCreateBooking`.

Combine date + time into a single `date_time` ISO string before inserting.

On success: `toast.success('Session booked')`, close sheet, calendar refreshes.

### 5E — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the week strip show correctly with today highlighted?
- Does tapping a day load that day's bookings?
- Does create booking combine date + time correctly into an ISO timestamp?

---

## Step 6 — Payments list + Log payment + Mark received

**Goal:** PT sees exactly who owes money, how much, and how long overdue. Marks it received in one tap.

**Identity check:** At month-end a PT needs to see total outstanding in 1 second. Red = urgent. That's it.

### 6A — New payments hook
Create `src/hooks/usePayments.ts`:

```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Payment } from "@/types/database"

export type PaymentWithClient = Payment & {
  clients: { first_name: string; last_name: string; whatsapp_number: string } | null
}

export function usePayments(status?: 'pending' | 'overdue' | 'received') {
  const supabase = createClient()
  return useQuery({
    queryKey: ['payments', status],
    queryFn: async (): Promise<PaymentWithClient[]> => {
      let query = supabase
        .from('payments')
        .select('*, clients(first_name, last_name, whatsapp_number)')
        .order('due_date', { ascending: true })
      if (status) {
        query = query.eq('status', status)
      }
      const { data, error } = await query
      if (error) throw error
      return data as PaymentWithClient[]
    },
  })
}

export function useCreatePayment() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'trainer_id' | 'created_at' | 'overdue_reminder_stage'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('payments').insert({
        ...payment,
        trainer_id: user!.id,
        overdue_reminder_stage: 'none',
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMarkPaymentReceived() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase.from('payments').update({
        status: 'received',
        received_date: today,
        overdue_reminder_stage: 'none',
      }).eq('id', paymentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

### 6B — Payments page
File: `src/app/(dashboard)/payments/page.tsx`

Replace the stub.

**Summary bar (top):**
- Total outstanding = sum of all payments where status IN ('pending', 'overdue')
- Show as large text: "**$1,450** outstanding"
- Muted subtext: "X overdue · Y pending"

**Filter tabs:**
Use `Tabs` component: "All" | "Overdue" | "Pending" | "Received"
Each tab calls `usePayments(tabFilter)` — or filter client-side from the "All" dataset.
Show count badge on each tab (e.g. "Overdue (3)").

**Payment list — sort order:**
1. Overdue first (by days overdue, most overdue first)
2. Pending (by due_date ascending)
3. Received (by received_date descending)

**Each payment row:**
- Left: Avatar with client initials (use `Avatar`)
- Centre:
  - Client name (bold)
  - Method badge (PayNow/Cash/Bank/Card — small pill)
  - Due date or received date (muted, formatted as "Due 25 Mar" or "Received 25 Mar")
- Right: amount (bold, "**$450**") + status badge
- Overdue rows: red left border (`border-l-4 border-red-500`)
- Tap row → open `PaymentDetailSheet`

**FAB "+"** → open `LogPaymentSheet`

**Skeletons** while loading: 4 row skeletons

### 6C — PaymentDetailSheet component
File: `src/components/clients/PaymentDetailSheet.tsx`

Props: `payment: PaymentWithClient`, `open: boolean`, `onOpenChange: (open: boolean) => void`

Shows full payment detail: client name, amount, method, reference, notes, due date.

If `status` is "pending" or "overdue":
- "Mark as received" button (primary, full width) → calls `useMarkPaymentReceived(payment.id)`
  - On success: `toast.success('Payment marked as received')`, sheet closes
- "Send WhatsApp reminder" button (outline) → POST to `/api/reminders/manual` with `{ paymentId: payment.id }`
  - Shows loading state
  - On success: `toast.success('Reminder sent via WhatsApp')`
  - On error: `toast.error('Failed to send reminder')`

If `status` is "received": show "Payment received on [date]" — no action buttons.

### 6D — LogPaymentSheet component
File: `src/components/clients/LogPaymentSheet.tsx`

Props: `open: boolean`, `onOpenChange: (open: boolean) => void`

Fields:
1. Client (Select from `useClients()`)
2. Amount (Input type="number", prefix "$")
3. Method (Select: PayNow / Cash / Bank transfer / Card / Other)
4. Reference (Input, optional, placeholder "PayNow ref: abc123 or bank ref")
5. Due date (Input type="date", optional — leave blank if paying now)
6. Notes (Textarea, optional)

"Log payment" → calls `useCreatePayment`.
On success: `toast.success('Payment logged')`, sheet closes.

### 6E — Manual reminder API endpoint
Create `src/app/api/reminders/manual/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendTemplateMessage } from "@/lib/wati"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentId } = await request.json()

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*, clients(first_name, whatsapp_number), profiles(name, paynow_details)')
    .eq('id', paymentId)
    .eq('trainer_id', user.id)
    .single()

  if (error || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const client = payment.clients as any
  const trainer = payment.profiles as any

  const result = await sendTemplateMessage({
    whatsappNumber: client.whatsapp_number,
    templateName: 'payment_reminder_manual',
    parameters: [
      { name: 'client_name', value: client.first_name },
      { name: 'amount', value: `$${payment.amount}` },
      { name: 'trainer_name', value: trainer.name },
      { name: 'paynow_details', value: trainer.paynow_details || 'contact your trainer' },
    ],
  })

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

### 6F — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the overdue sort work correctly?
- Does mark as received clear the overdue styling?

---

## Step 7 — WhatsApp reminder cron (the retention engine)

**Goal:** Every 30 minutes, the system automatically sends the right WhatsApp message to the right person. Zero manual intervention from the PT.

**Identity check:** A PT should never have to remember to send a reminder. The app does it. That's the point.

### 7A — Implement the cron route
File: `src/app/api/reminders/route.ts`

Replace the placeholder stub with the full implementation.

**Security first — add this at the top:**
```typescript
const cronSecret = request.headers.get('x-cron-secret')
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Use `createClient()` from `@/lib/supabase/server` — this has service role access for cron jobs.

**Structure:** Wrap every trigger in its own try/catch. One failure must NEVER stop the others. Collect results in a summary object.

**TRIGGER 1 — 24h session reminders:**
```sql
SELECT bookings.*, clients.whatsapp_number, clients.first_name, profiles.name as trainer_name
FROM bookings
JOIN clients ON bookings.client_id = clients.id
JOIN profiles ON bookings.trainer_id = profiles.id
WHERE bookings.date_time BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
AND bookings.reminder_24h_sent = false
AND bookings.status IN ('confirmed', 'pending')
```
For each: call `sendTemplateMessage` with template `'session_reminder_24h'`, params: `client_name`, `date`, `time`, `location`, `trainer_name`.
Then: `UPDATE bookings SET reminder_24h_sent = true WHERE id = booking.id`

**TRIGGER 2 — 1h session reminders:**
Same pattern but `BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'`
Template: `'session_reminder_1h'`
Then: `UPDATE bookings SET reminder_1h_sent = true WHERE id = booking.id`

**TRIGGER 3 — New pending booking notification to trainer (from client link):**
```sql
SELECT bookings.*, clients.first_name, clients.whatsapp_number, profiles.whatsapp_number as trainer_wa, profiles.name as trainer_name
FROM bookings
JOIN clients ON bookings.client_id = clients.id
JOIN profiles ON bookings.trainer_id = profiles.id
WHERE bookings.booking_source = 'client_link'
AND bookings.status = 'pending'
AND bookings.created_at > NOW() - INTERVAL '35 minutes'
```
For each: send WhatsApp to TRAINER (not client) with template `'new_booking_request'`, params: `client_name`, `date`, `time`, `session_type`.

**TRIGGER 4 — Package low sessions alert (≤2 remaining):**
```sql
SELECT packages.*, clients.first_name, clients.whatsapp_number, profiles.name as trainer_name
FROM packages
JOIN clients ON packages.client_id = clients.id
JOIN profiles ON packages.trainer_id = profiles.id
WHERE (packages.total_sessions - packages.sessions_used) <= 2
AND packages.status = 'active'
AND (packages.last_low_session_alert_sent IS NULL OR packages.last_low_session_alert_sent < NOW() - INTERVAL '7 days')
```
NOTE: You need to add `last_low_session_alert_sent timestamptz` column to the packages table. Add this SQL migration at the bottom of `supabase/schema.sql` as a comment block:
```sql
-- Migration: add last_low_session_alert_sent to packages
-- ALTER TABLE public.packages ADD COLUMN last_low_session_alert_sent timestamptz;
```
Also add the field to the `Package` interface in `src/types/database.ts`: `last_low_session_alert_sent: string | null`

For each: send template `'package_low_sessions'`, params: `client_name`, `sessions_remaining`, `trainer_name`.
Then: `UPDATE packages SET last_low_session_alert_sent = NOW() WHERE id = package.id`

**TRIGGER 5 — Payment due today:**
```sql
SELECT payments.*, clients.first_name, clients.whatsapp_number, profiles.name as trainer_name, profiles.paynow_details
FROM payments
JOIN clients ON payments.client_id = clients.id
JOIN profiles ON payments.trainer_id = profiles.id
WHERE payments.due_date = CURRENT_DATE
AND payments.status = 'pending'
AND payments.overdue_reminder_stage = 'none'
```
Template: `'payment_due_today'`, params: `client_name`, `amount`, `paynow_details`, `trainer_name`.
Do NOT update `overdue_reminder_stage` — it's still not overdue.

**TRIGGER 6 — Overdue day 1 (1 day past due):**
```sql
WHERE payments.due_date = CURRENT_DATE - INTERVAL '1 day'
AND payments.status = 'pending'
AND payments.overdue_reminder_stage = 'none'
```
Template: `'payment_overdue_1'` — friendly tone.
Then: `UPDATE payments SET overdue_reminder_stage = 'day_1' WHERE id = payment.id`

**TRIGGER 7 — Overdue day 3:**
```sql
WHERE payments.due_date <= CURRENT_DATE - INTERVAL '3 days'
AND payments.status = 'pending'
AND payments.overdue_reminder_stage = 'day_1'
```
Template: `'payment_overdue_3'` — firmer tone.
Then: `UPDATE payments SET overdue_reminder_stage = 'day_3' WHERE id = payment.id`

**TRIGGER 8 — Overdue day 7 + auto-pause client:**
```sql
WHERE payments.due_date <= CURRENT_DATE - INTERVAL '7 days'
AND payments.status = 'pending'
AND payments.overdue_reminder_stage = 'day_3'
```
Template: `'payment_overdue_7'` — hold notice, firm but professional.
Then:
1. `UPDATE payments SET overdue_reminder_stage = 'day_7' WHERE id = payment.id`
2. `UPDATE clients SET status = 'paused' WHERE id = payment.client_id`

**Return summary:**
```typescript
return NextResponse.json({
  success: true,
  summary: {
    session_24h: trigger1Count,
    session_1h: trigger2Count,
    new_booking_notify: trigger3Count,
    low_sessions: trigger4Count,
    payment_due: trigger5Count,
    overdue_day1: trigger6Count,
    overdue_day3: trigger7Count,
    overdue_day7: trigger8Count,
  },
  errors: errorLog, // array of { trigger, error } objects
  ran_at: new Date().toISOString(),
})
```

Add `CRON_SECRET=` to `.env.local.example`

### 7B — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Is every trigger in its own try/catch?
- Does the route return 401 if CRON_SECRET header is missing?

---

## Step 8 — Stripe subscriptions + Upgrade flow

**Goal:** Free PTs upgrade to Pro. $19/month. Everything already exists — we just need to wire it.

**Identity check:** The upgrade decision happens in 10 seconds. Make the benefits obvious. Remove all friction.

### 8A — Stripe webhook
File: `src/app/api/webhooks/stripe/route.ts`

Replace the stub:

```typescript
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (userId) {
        await supabase.from('profiles').update({
          subscription_plan: 'pro',
          stripe_customer_id: session.customer as string,
        }).eq('id', userId)
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('profiles').update({ subscription_plan: 'free' })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const plan = sub.status === 'active' ? 'pro' : 'free'
      await supabase.from('profiles').update({ subscription_plan: plan })
        .eq('stripe_customer_id', sub.customer as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

### 8B — Checkout API route
Create `src/app/api/checkout/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { interval } = await request.json() // 'month' or 'year'
  const priceId = interval === 'year'
    ? process.env.STRIPE_PRO_PRICE_YEARLY_ID!
    : process.env.STRIPE_PRO_PRICE_MONTHLY_ID!

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
    customer_email: user.email,
    metadata: { user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
```

### 8C — Billing portal route
Create `src/app/api/portal/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles')
    .select('stripe_customer_id').eq('id', user.id).single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
  })

  return NextResponse.json({ url: session.url })
}
```

### 8D — Upgrade page
Create `src/app/upgrade/page.tsx`:

Clean, conversion-focused page:
- Headline: "Upgrade to FitDesk Pro"
- Price: "**$19**/month" — or "**$190**/year (save 2 months)"
- Toggle between monthly/annual billing (simple state toggle)
- Benefits list (use actual checkmarks, not bullet points):
  - ✓ Unlimited clients
  - ✓ WhatsApp session reminders (24h + 1h)
  - ✓ Automated payment chasers (day 1, 3, 7)
  - ✓ Cash, PayNow, bank transfer tracking
  - ✓ Package session countdown
  - ✓ Public booking link for clients
  - ✓ Client self-booking page
- "Upgrade now" button (primary, full width, shows loading state)
  - On click: POST to `/api/checkout` with `{ interval: 'month' | 'year' }`
  - On response: `window.location.href = data.url` (redirect to Stripe)

### 8E — Upgrade success page
Create `src/app/upgrade/success/page.tsx`:

- Title: "You're on Pro! 🎉"
- Simple list of what's now unlocked
- "Go to dashboard" button → `router.push('/')`

### 8F — Add to .env.local.example
```
STRIPE_PRO_PRICE_MONTHLY_ID=
STRIPE_PRO_PRICE_YEARLY_ID=
CRON_SECRET=
```

### 8G — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the webhook correctly verify the Stripe signature?
- Does the checkout route require auth?

---

## Step 9 — Public booking page

**Goal:** The PT shares one link. Clients tap it, fill in their name + WhatsApp, pick a time, done. No account required.

**Identity check:** A client tapping this link from an Instagram bio has never heard of FitDesk. The page must look professional and load in under 2 seconds.

### 9A — Implement the bookings API
File: `src/app/api/bookings/route.ts`

Replace the stub:

```typescript
import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const BookingRequestSchema = z.object({
  trainer_id: z.string().uuid(),
  client_name: z.string().min(2),
  client_whatsapp: z.string().min(8),
  preferred_date: z.string(),
  preferred_time: z.string(),
  session_type: z.enum(['1-on-1', 'group', 'assessment']),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const parsed = BookingRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
  }

  const { trainer_id, client_name, client_whatsapp, preferred_date, preferred_time, session_type, notes } = parsed.data
  const [firstName, ...rest] = client_name.split(' ')
  const lastName = rest.join(' ') || '-'

  // Upsert client by whatsapp number
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('trainer_id', trainer_id)
    .eq('whatsapp_number', client_whatsapp)
    .single()

  let clientId: string
  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error } = await supabase.from('clients').insert({
      trainer_id,
      first_name: firstName,
      last_name: lastName,
      whatsapp_number: client_whatsapp,
      status: 'active',
    }).select('id').single()
    if (error || !newClient) return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    clientId = newClient.id
  }

  // Get trainer's default payment mode
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_booking_payment_mode')
    .eq('id', trainer_id)
    .single()

  // Build date_time from preferred_date + preferred_time
  const dateTime = new Date(`${preferred_date}T${preferred_time}:00`).toISOString()

  const { data: booking, error } = await supabase.from('bookings').insert({
    trainer_id,
    client_id: clientId,
    date_time: dateTime,
    duration_mins: 60,
    session_type,
    status: 'pending',
    booking_source: 'client_link',
    payment_mode: profile?.default_booking_payment_mode || 'pay_later',
    client_intake_notes: notes || null,
    reminder_24h_sent: false,
    reminder_1h_sent: false,
  }).select('id').single()

  if (error || !booking) return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })

  return NextResponse.json({ success: true, bookingId: booking.id })
}
```

### 9B — Public booking page
File: `src/app/book/[slug]/page.tsx`

This is a server component. Replace the stub:

Fetch trainer by slug server-side. If not found, show a clean "Trainer not found" page.

Show:
- Trainer avatar (initials, large circle, primary background)
- Trainer name (bold, 20px)
- Bio (if populated, muted text)
- Specialisation pill badges (if populated)

Booking form (client component — create `src/components/BookingForm.tsx`):
- Your name (Input, required)
- Your WhatsApp number (Input, required, placeholder "+65 9123 4567")
- Session type (Select: 1-on-1 / Group / Assessment)
- Preferred date (Input type="date", min=today)
- Preferred time (Select: 6:00 AM to 9:00 PM in 30-min increments)
- Message/notes (Textarea, optional, placeholder "Any injuries or goals I should know about?")
- "Request booking" button (primary, full width)

On submit: POST to `/api/bookings` with `{ trainer_id, client_name, client_whatsapp, preferred_date, preferred_time, session_type, notes }`.

Success state (replace form):
- "Booking request sent! ✓"
- "[Trainer name] will confirm your session via WhatsApp shortly."
- "Add to your calendar?" (optional — implement as a link that generates a .ics download, or skip for now)

**OG meta tags** for WhatsApp preview when PT shares the link:
```typescript
export async function generateMetadata({ params }) {
  // fetch trainer by slug
  return {
    title: `Book a session with ${trainerName}`,
    description: trainerBio || `Book your personal training session with ${trainerName}`,
    openGraph: {
      title: `Book a session with ${trainerName}`,
      description: trainerBio || `Personal training sessions — book online`,
    },
  }
}
```

### 9C — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the public page load without authentication?
- Does the Zod validation reject bad input?

---

## Step 10 — Profile + Settings page

**Goal:** PT configures their PayNow details, booking link, and default settings. Views and manages their subscription.

**Identity check:** A PT sets this up once and never needs to touch it again. Every field must save silently without a page reload.

### 10A — Add Profile tab to bottom nav
File: `src/components/shared/bottom-nav.tsx`

Add 5th tab:
```typescript
import { Home, Users, CalendarDays, DollarSign, UserCircle } from "lucide-react"

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/bookings", label: "Calendar", icon: CalendarDays },
  { href: "/payments", label: "Payments", icon: DollarSign },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const
```

Adjust active detection for "/" to be exact match only (pathname === "/" not pathname.startsWith("/")).

### 10B — Profile page
Create `src/app/(dashboard)/profile/page.tsx`

Fetch profile data from Supabase on mount. Use local state for editable fields.

**Section 1 — Trainer profile:**
Title: "Your profile"
- Avatar (large initials circle, 64px)
- Name (Input, saves on blur or explicit save)
- WhatsApp number (Input)
- Bio (Textarea, optional)
- Specialisations (Input, placeholder "Weight loss, strength training, HIIT", comma-separated, displayed as pill badges below)
- "Save profile" button → UPDATE profiles WHERE id = user.id
- On success: `toast.success('Profile saved')`

**Section 2 — Booking settings:**
Title: "Your booking link"
- Slug field (Input, shows current slug, editable)
- Live preview below: `fitdesk.app/book/[slug]` — updates as they type
- "Copy link" button → copies the full URL to clipboard, button text changes to "Copied! ✓" for 2 seconds
- "Share link" button → uses Web Share API if available (`navigator.share`), falls back to copy
- Default session duration (Select: 30 / 45 / 60 / 90 min)
- Default payment mode (Select: Pay later / Pay now / From package)
- PayNow details (Input, placeholder "9123 4567 or T12ABC123D", helper text "Shown in all payment reminder messages")
- "Save booking settings" button → UPDATE profiles

**Section 3 — Subscription:**
Title: "Subscription"
Fetch `subscription_plan` from profiles.

If `subscription_plan === 'free'`:
- Badge: "Free plan"
- Text: "3 clients maximum. Upgrade for unlimited."
- "Upgrade to Pro — $19/month" button → `router.push('/upgrade')`

If `subscription_plan === 'pro'`:
- Badge: "Pro" (green)
- Text: "Unlimited clients. All features active."
- "Manage subscription" button → POST to `/api/portal`, then `window.location.href = data.url`

**Section 4 — Account:**
Title: "Account"
- "Sign out" button (destructive outline) → `supabase.auth.signOut()` → `router.push('/login')`
- Version: read from package.json or hardcode "v1.0.0" for now

### 10C — Verify step
- Run `npx tsc --noEmit` — fix all errors
- Does the profile page load correctly?
- Does the copy link button work?
- Does sign out redirect to /login?

---

## Step 11 — Full Phase 1 quality gate

**Goal:** Ship-ready code. Zero type errors. Zero security holes. Zero crashes on empty data.

This is the final step. Run each check in sequence. Fix every issue before marking Phase 1 complete.

### 11A — TypeScript check
```bash
npx tsc --noEmit
```
Fix ALL errors. Zero tolerance. Do not proceed with type errors.

### 11B — Build check
```bash
npm run build
```
Fix all build errors. A build warning is acceptable. An error is not.

### 11C — Lint check
```bash
npm run lint
```
Fix all lint errors. Warnings are acceptable for now.

### 11D — Invoke agents

**Invoke the `typescript-reviewer` agent:**
Review these files specifically:
- All files in `src/app/(dashboard)/`
- All files in `src/components/clients/`
- All files in `src/hooks/`
- All files in `src/app/api/`
Focus on: async correctness, missing error handling, unhandled promise rejections, console.log statements left in production code.

**Invoke the `database-reviewer` agent:**
Review all Supabase queries in:
- `src/hooks/useDashboard.ts`
- `src/hooks/useClients.ts`
- `src/hooks/useBookings.ts`
- `src/hooks/usePackages.ts`
- `src/hooks/usePayments.ts`
- `src/app/api/reminders/route.ts`
- `src/app/api/bookings/route.ts`
Check: RLS policies active, foreign key indexes, no SELECT *, no N+1 patterns, proper use of server vs browser Supabase client.

**Invoke the `security-reviewer` agent:**
Check:
- Stripe webhook signature verification in `/api/webhooks/stripe`
- CRON_SECRET header check in `/api/reminders`
- Auth guard on all `/api/` routes that require it
- `/book/[slug]` and `/api/bookings` are correctly public (no auth required)
- No hardcoded API keys, tokens, or secrets in any source file
- All user inputs validated with Zod before database operations

### 11E — Empty state audit
Manually verify each screen handles zero data without crashing:
- Dashboard with 0 clients, 0 bookings, 0 payments → renders empty states, not errors
- Client list with 0 clients → shows "No clients yet" message
- Calendar with no bookings on selected day → shows "No sessions" message
- Payments with 0 payments → shows empty state

### 11F — Save session
Run `/checkpoint` to save the session state.

### 11G — Phase 1 completion report
After all checks pass, output a completion report:

```
PHASE 1 COMPLETE ✓

Files created:
[list every new file created]

Files modified:
[list every file modified]

Phase 1 checklist:
[x] Auth — login, signup, onboarding
[x] Dashboard — 3 stat widgets, low session list
[x] Client list — search, filter, add client, paywall
[x] Client detail — profile, package card, mark session done
[x] Package creation
[x] Bookings calendar — week view, create booking, mark complete/cancel/no-show
[x] Payments list — overdue sort, filter tabs, log payment, mark received
[x] Manual WhatsApp reminder from payments screen
[x] Automated cron — all 8 WhatsApp triggers
[x] Stripe webhook — subscription lifecycle
[x] Stripe checkout — monthly + annual
[x] Billing portal
[x] Upgrade page
[x] Public booking page — /book/[slug]
[x] Booking creation API — client upsert + booking insert
[x] Profile + settings page
[x] Bottom nav — 5 tabs

Next step: Deploy to Vercel for first beta PT user.
Run: vercel --prod
```

---

## Notes for Claude Code

- **Do not ask for confirmation between steps.** Execute each step, verify it, and move immediately to the next.
- **If a TypeScript error occurs that you cannot fix in 3 attempts**, add a `// TODO: fix type` comment, note it in the completion report, and move on. Do not get stuck.
- **If a Supabase query returns unexpected results**, check the RLS policies in `supabase/schema.sql` first — the trainer_id filter is handled by RLS, not always in the query.
- **If WATI sends fail**, log the error but do not throw — WATI failures must never crash the cron job.
- **Mobile-first always.** Every component you build: open Chrome DevTools, set viewport to 390px width, verify it looks correct before moving to the next step.
- **The ECC agents will run automatically** after every file edit (typescript-reviewer) and before every commit (security-reviewer). Let them run. If they flag a CRITICAL issue, fix it immediately before proceeding.
- **Your identity:** You are a PT who knows the pain, a developer who ships clean code, and an MBA who knows that every hour without a working app is a missed dollar. Move fast. Ship clean.
