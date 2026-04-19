-- ============================================================
-- FitDesk — Supabase SQL Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  photo_url     text,
  whatsapp_number text not null,
  booking_slug  text unique not null,
  bio           text,
  specialisations text[] default '{}',
  default_session_mins integer not null default 60,
  subscription_plan text not null default 'free'
    check (subscription_plan in ('free', 'pro')),
  stripe_customer_id text,
  -- Default payment mode for this trainer's booking flow.
  -- PT can override per individual booking. Defaults to pay_later
  -- (safest for cash/PayNow-heavy SEA market).
  default_booking_payment_mode text not null default 'pay_later'
    check (default_booking_payment_mode in ('pay_now', 'pay_later', 'from_package')),
  -- PT's PayNow number or UEN shown in reminder messages.
  paynow_details text,
  created_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, whatsapp_number, booking_slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp_number', ''),
    lower(replace(coalesce(new.raw_user_meta_data ->> 'name', new.id::text), ' ', '-'))
      || '-' || substr(new.id::text, 1, 8)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Public profile reads are handled via service client in API routes
-- (booking page, availability). No blanket public SELECT policy —
-- the previous `using (true)` exposed sensitive fields (whatsapp_number,
-- paynow_details, stripe_customer_id) to unauthenticated callers.

-- ============================================================
-- 2. CLIENTS
-- ============================================================
create table public.clients (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid not null references public.profiles(id) on delete cascade,
  first_name      text not null,
  last_name       text not null,
  photo_url       text,
  whatsapp_number text not null,
  email           text,
  goals           text,
  injuries_medical text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  status          text not null default 'active'
    check (status in ('active', 'inactive', 'paused')),
  last_session_date timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_clients_trainer on public.clients(trainer_id);

-- RLS
alter table public.clients enable row level security;

create policy "Trainers manage own clients"
  on public.clients for all
  using (trainer_id = auth.uid());

-- ============================================================
-- 3. PACKAGES
-- ============================================================
create table public.packages (
  id              uuid primary key default uuid_generate_v4(),
  trainer_id      uuid not null references public.profiles(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  name            text not null,
  total_sessions  integer not null check (total_sessions > 0),
  sessions_used   integer not null default 0 check (sessions_used >= 0),
  price           numeric(10,2) not null check (price >= 0),
  amount_paid     numeric(10,2) not null default 0 check (amount_paid >= 0),
  payment_status  text not null default 'unpaid'
    check (payment_status in ('unpaid', 'partial', 'paid')),
  status          text not null default 'active'
    check (status in ('active', 'completed', 'expired')),
  start_date      date not null default current_date,
  expiry_date     date,
  created_at      timestamptz not null default now(),

  constraint sessions_used_lte_total check (sessions_used <= total_sessions)
);

create index idx_packages_trainer on public.packages(trainer_id);
create index idx_packages_client on public.packages(client_id);

-- RLS
alter table public.packages enable row level security;

create policy "Trainers manage own packages"
  on public.packages for all
  using (trainer_id = auth.uid());

-- ============================================================
-- 4. SESSIONS (completed logs)
-- ============================================================
create table public.sessions (
  id            uuid primary key default uuid_generate_v4(),
  trainer_id    uuid not null references public.profiles(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  package_id    uuid references public.packages(id) on delete set null,
  date_time     timestamptz not null,
  duration_mins integer not null default 60 check (duration_mins > 0),
  location      text,
  notes         text,
  status        text not null default 'completed'
    check (status in ('completed', 'cancelled', 'no-show')),
  created_at    timestamptz not null default now()
);

create index idx_sessions_trainer on public.sessions(trainer_id);
create index idx_sessions_client on public.sessions(client_id);
create index idx_sessions_date on public.sessions(date_time);

-- RLS
alter table public.sessions enable row level security;

create policy "Trainers manage own sessions"
  on public.sessions for all
  using (trainer_id = auth.uid());

-- ============================================================
-- 5. BOOKINGS (future scheduled sessions)
-- ============================================================
create table public.bookings (
  id                  uuid primary key default uuid_generate_v4(),
  trainer_id          uuid not null references public.profiles(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete cascade,
  package_id          uuid references public.packages(id) on delete set null,
  date_time           timestamptz not null,
  duration_mins       integer not null default 60 check (duration_mins > 0),
  location            text,
  session_type        text not null default '1-on-1'
    check (session_type in ('1-on-1', 'group', 'assessment')),
  status              text not null default 'confirmed'
    check (status in ('confirmed', 'pending', 'cancelled', 'completed', 'no-show')),
  -- Payment mode for this specific booking.
  -- Overrides profile.default_booking_payment_mode for this booking only.
  -- pay_now:      client pays via Stripe at booking time; booking stays
  --               "pending" until Stripe webhook confirms payment.
  -- pay_later:    PT bills offline; a Payment row is created with
  --               status=pending and a due_date for reminder cron.
  -- from_package: session deducted from a linked package; no Payment
  --               row created, package.sessions_used increments on complete.
  payment_mode        text not null default 'pay_later'
    check (payment_mode in ('pay_now', 'pay_later', 'from_package')),
  -- Stripe PaymentIntent ID — only set when payment_mode = 'pay_now'.
  stripe_payment_intent_id text,
  reminder_24h_sent   boolean not null default false,
  reminder_1h_sent    boolean not null default false,
  booking_source      text not null default 'trainer'
    check (booking_source in ('trainer', 'client_link')),
  client_intake_notes text,
  created_at          timestamptz not null default now()
);

create index idx_bookings_trainer on public.bookings(trainer_id);
create index idx_bookings_date on public.bookings(date_time);
create index idx_bookings_status on public.bookings(status);

-- RLS
alter table public.bookings enable row level security;

create policy "Trainers manage own bookings"
  on public.bookings for all
  using (trainer_id = auth.uid());

-- Allow public inserts for client booking page (client_link source)
create policy "Public can create bookings via booking link"
  on public.bookings for insert
  with check (booking_source = 'client_link');

-- ============================================================
-- 6. PAYMENTS (manual tracking)
-- ============================================================
create table public.payments (
  id            uuid primary key default uuid_generate_v4(),
  trainer_id    uuid not null references public.profiles(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  package_id    uuid references public.packages(id) on delete set null,
  -- booking_id links this payment to a specific session (pay_now / pay_later).
  -- Null for package-level instalments not tied to a single booking.
  booking_id    uuid references public.bookings(id) on delete set null,
  amount        numeric(10,2) not null check (amount > 0),
  method        text not null default 'cash'
    check (method in ('PayNow', 'cash', 'bank_transfer', 'card', 'other')),
  status        text not null default 'pending'
    check (status in ('received', 'pending', 'overdue')),
  due_date      date,
  received_date date,
  reference     text,
  notes         text,
  -- Tracks overdue reminder stage so the cron does not re-send messages.
  -- Progresses: none -> due_today_sent -> day_1 -> day_3 -> day_7.
  overdue_reminder_stage text not null default 'none'
    check (overdue_reminder_stage in ('none', 'due_today_sent', 'day_1', 'day_3', 'day_7')),
  created_at    timestamptz not null default now()
);

create index idx_payments_trainer on public.payments(trainer_id);
create index idx_payments_client on public.payments(client_id);
create index idx_payments_status on public.payments(status);

-- RLS
alter table public.payments enable row level security;

create policy "Trainers manage own payments"
  on public.payments for all
  using (trainer_id = auth.uid());

-- ============================================================
-- RPC: Atomic session increment (avoids TOCTOU race condition)
-- ============================================================
create or replace function public.increment_sessions_used(p_package_id uuid)
returns json
language plpgsql
security invoker
as $$
declare
  v_sessions_used integer;
  v_total_sessions integer;
  v_new_status text;
begin
  update public.packages
    set sessions_used = sessions_used + 1,
        status = case
          when sessions_used + 1 >= total_sessions then 'completed'
          else 'active'
        end
    where id = p_package_id
      and sessions_used < total_sessions
    returning sessions_used, total_sessions, status
    into v_sessions_used, v_total_sessions, v_new_status;

  if not found then
    raise exception 'Package not found or all sessions already used';
  end if;

  return json_build_object(
    'sessions_used', v_sessions_used,
    'total_sessions', v_total_sessions,
    'status', v_new_status
  );
end;
$$;

-- ============================================================
-- Trigger: enforce 3-client limit for free-plan trainers
-- ============================================================
create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan text;
  v_count integer;
begin
  select subscription_plan into v_plan
    from public.profiles
    where id = new.trainer_id;

  if v_plan = 'free' then
    select count(*) into v_count
      from public.clients
      where trainer_id = new.trainer_id;

    if v_count >= 3 then
      raise exception 'Free plan is limited to 3 clients. Upgrade to Pro for unlimited clients.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger check_client_limit
  before insert on public.clients
  for each row execute function public.enforce_client_limit();

-- ============================================================
-- MIGRATIONS — run these manually in Supabase SQL Editor
-- after the initial schema has been applied
-- ============================================================

-- Migration: add instagram_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url text;

-- Migration: add last_low_session_alert_sent to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS last_low_session_alert_sent timestamptz;

-- Migration: add missing indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);

-- Migration: Phase A-0 — session_tokens, booking_approvals, expanded booking status

-- Session tokens for token-based session management links
CREATE TABLE IF NOT EXISTS public.session_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_session_tokens_token ON public.session_tokens(token);
CREATE INDEX IF NOT EXISTS idx_session_tokens_booking_id ON public.session_tokens(booking_id);

ALTER TABLE public.session_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.session_tokens
  USING (false) WITH CHECK (false);

-- Booking approvals for public booking approval workflow
CREATE TABLE IF NOT EXISTS public.booking_approvals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  created_at timestamptz default now()
);

ALTER TABLE public.booking_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PT can manage own booking approvals" ON public.booking_approvals FOR ALL
  USING (
    exists (
      select 1 from public.bookings b
      where b.id = booking_approvals.booking_id
      and b.trainer_id = auth.uid()
    )
  );

-- New columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text CHECK (cancelled_by IN ('pt', 'client')),
  ADD COLUMN IF NOT EXISTS late_minutes integer,
  ADD COLUMN IF NOT EXISTS attendance_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS chase_sent_at timestamptz;

-- New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cancellation_policy_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS booking_approval_required boolean NOT NULL DEFAULT true;

-- Migration: Phase B-0 — Payment tracking columns + nutrition_logs table

-- Payment details on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paynow_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS payment_reminder_default_days integer NOT NULL DEFAULT 3;

-- Payment tracking on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'client_confirmed', 'paid', 'waived')),
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS client_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pt_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;

-- Per-client payment reminder frequency
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_reminder_days integer;

-- Nutrition logs table
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url text,
  meal_name text,
  meal_type text CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  ai_raw_response text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_id ON public.nutrition_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_trainer_logged
  ON public.nutrition_logs (trainer_id, logged_at DESC);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PTs can insert logs for their clients"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "PTs can view logs for their clients"
  ON public.nutrition_logs FOR SELECT
  USING (trainer_id = auth.uid());

-- Migration: add session_notes to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS session_notes text;

-- Migration: add booking page sales fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS booking_headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS why_train_with_me text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pricing_from numeric(10,2);

-- Migration: add last_reactivation_alert_sent to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_reactivation_alert_sent timestamptz;

-- Migration: add testimonials to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS testimonial_1 text,
  ADD COLUMN IF NOT EXISTS testimonial_2 text,
  ADD COLUMN IF NOT EXISTS testimonial_3 text;

-- Migration: add training_locations to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_locations text[] DEFAULT '{}';

-- Migration: add onboarding fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb NOT NULL DEFAULT '{}';

-- Migration: PT Availability System

CREATE TABLE IF NOT EXISTS public.pt_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trainer_id, day_of_week)
);

ALTER TABLE public.pt_working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own working hours"
  ON public.pt_working_hours FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Public can read working hours for booking"
  ON public.pt_working_hours FOR SELECT
  USING (true);

CREATE TABLE IF NOT EXISTS public.pt_blocked_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time text,
  end_time text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_trainer_date
  ON public.pt_blocked_slots(trainer_id, date);

ALTER TABLE public.pt_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own blocked slots"
  ON public.pt_blocked_slots FOR ALL
  USING (trainer_id = auth.uid());

CREATE POLICY "Public can read blocked slots for booking"
  ON public.pt_blocked_slots FOR SELECT
  USING (true);

-- ============================================================
-- Migration: Calendar Control Features
-- ============================================================

-- Weekly default open slots per trainer
CREATE TABLE IF NOT EXISTS public.pt_open_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  duration_mins integer NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trainer_id, day_of_week, start_time)
);
ALTER TABLE public.pt_open_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own open slots"
  ON public.pt_open_slots FOR ALL USING (trainer_id = auth.uid());
CREATE POLICY "Public read open slots"
  ON public.pt_open_slots FOR SELECT USING (true);

-- Per-date overrides (add or remove slots for a specific date)
CREATE TABLE IF NOT EXISTS public.pt_date_slot_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  duration_mins integer,
  is_removed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(trainer_id, date, start_time)
);
CREATE INDEX IF NOT EXISTS idx_date_slot_overrides_trainer_date
  ON public.pt_date_slot_overrides(trainer_id, date);
ALTER TABLE public.pt_date_slot_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own date overrides"
  ON public.pt_date_slot_overrides FOR ALL USING (trainer_id = auth.uid());
CREATE POLICY "Public read date overrides"
  ON public.pt_date_slot_overrides FOR SELECT USING (true);

-- Recurring schedules for package clients
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  duration_mins integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_trainer
  ON public.recurring_schedules(trainer_id, active);
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own recurring schedules"
  ON public.recurring_schedules FOR ALL USING (trainer_id = auth.uid());

-- Migration: add 'recurring' to booking_source check constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_source_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_source_check
  CHECK (booking_source IN ('trainer', 'client_link', 'recurring'));

-- Migration: Phase L — WhatsApp automation log + opt-out flag
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'suppressed_opt_out', 'failed'))
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_trainer_sent
  ON public.whatsapp_logs (trainer_id, sent_at DESC);
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers read own whatsapp logs"
  ON public.whatsapp_logs FOR SELECT
  USING (trainer_id = (SELECT auth.uid()));

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_opted_out boolean NOT NULL DEFAULT false;

-- Migration: Phase M — statement-scoped auth.uid() for nutrition_logs RLS
DROP POLICY IF EXISTS "PTs can insert logs for their clients" ON public.nutrition_logs;
CREATE POLICY "PTs can insert logs for their clients"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (trainer_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "PTs can view logs for their clients" ON public.nutrition_logs;
CREATE POLICY "PTs can view logs for their clients"
  ON public.nutrition_logs FOR SELECT
  USING (trainer_id = (SELECT auth.uid()));
