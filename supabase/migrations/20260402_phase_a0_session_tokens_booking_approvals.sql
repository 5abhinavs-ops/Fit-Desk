-- ============================================================
-- Phase A-0: Database Migrations
-- session_tokens, booking_approvals, expanded booking status,
-- new columns on bookings and profiles
-- ============================================================

-- 1. SESSION TOKENS — token-based session management links
create table if not exists public.session_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_session_tokens_token on public.session_tokens(token);
create index if not exists idx_session_tokens_booking_id on public.session_tokens(booking_id);

alter table public.session_tokens enable row level security;

-- Service role only — no direct user access; accessed via API routes with service client
create policy "Service role only"
  on public.session_tokens
  using (false) with check (false);

-- 2. BOOKING APPROVALS — approval workflow for public bookings
create table if not exists public.booking_approvals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  created_at timestamptz default now()
);

alter table public.booking_approvals enable row level security;

create policy "PT can manage own booking approvals"
  on public.booking_approvals for all
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_approvals.booking_id
      and b.trainer_id = auth.uid()
    )
  );

-- 3. EXPAND BOOKING STATUS — merge existing + new statuses
-- Drop the existing inline check constraint (auto-named by Postgres)
-- and recreate with all statuses
do $$
declare
  constraint_name text;
begin
  -- Find the check constraint on bookings.status
  select con.conname into constraint_name
  from pg_constraint con
  join pg_attribute att on att.attrelid = con.conrelid
    and att.attnum = any(con.conkey)
  where con.conrelid = 'public.bookings'::regclass
    and con.contype = 'c'
    and att.attname = 'status';

  if constraint_name is not null then
    execute format('alter table public.bookings drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.bookings
  add constraint bookings_status_check
  check (status in (
    'confirmed', 'pending', 'cancelled', 'completed', 'no-show',
    'upcoming', 'forfeited', 'no_show', 'pending_approval', 'reschedule_requested'
  ));

-- 4. NEW COLUMNS ON BOOKINGS
alter table public.bookings
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text
    check (cancelled_by in ('pt', 'client')),
  add column if not exists late_minutes integer,
  add column if not exists attendance_confirmed_at timestamptz,
  add column if not exists chase_sent_at timestamptz;

-- 5. NEW COLUMNS ON PROFILES
alter table public.profiles
  add column if not exists cancellation_policy_hours integer not null default 24,
  add column if not exists booking_approval_required boolean not null default true;
