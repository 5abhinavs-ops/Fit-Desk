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

-- Public read for booking pages (by slug)
create policy "Public can view profiles by slug"
  on public.profiles for select
  using (true);

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
  amount        numeric(10,2) not null check (amount > 0),
  method        text not null default 'cash'
    check (method in ('PayNow', 'cash', 'bank_transfer', 'card', 'other')),
  status        text not null default 'pending'
    check (status in ('received', 'pending', 'overdue')),
  due_date      date,
  received_date date,
  reference     text,
  notes         text,
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
