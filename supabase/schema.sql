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
