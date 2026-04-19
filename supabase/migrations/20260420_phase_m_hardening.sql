-- ============================================================
-- Phase M — Hardening: composite index + RLS audit on nutrition_logs
-- ============================================================
-- This migration is a re-assertion + audit trail. The composite index
-- already exists (created by 20260409_nutrition_logs_index_and_rls_cleanup)
-- but Phase M formalizes it idempotently so fresh environments without
-- 20260409 applied still get the right index.
--
-- RLS audit finding: no further dead policies to drop. 20260409 already
-- removed the two client-auth policies that could never match (FitDesk
-- clients don't have Supabase Auth accounts). Current active policies:
--   - "PTs can insert logs for their clients" (INSERT, auth.uid() = trainer_id)
--   - "PTs can view logs for their clients"   (SELECT, auth.uid() = trainer_id)
-- UPDATE and DELETE are implicitly denied (fail-closed RLS default).
-- The app UI does not perform UPDATE or DELETE on nutrition_logs so this
-- is correct. If that changes, add scoped policies alongside the feature.

-- 1. Composite index (trainer_id, logged_at DESC) — idempotent re-assertion
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_trainer_logged
  ON public.nutrition_logs (trainer_id, logged_at DESC);

-- 2. Drop superseded single-column indexes (idempotent)
DROP INDEX IF EXISTS idx_nutrition_logs_trainer_id;
DROP INDEX IF EXISTS idx_nutrition_logs_logged_at;

-- 3. RLS audit: no dead policies remain to drop.
-- The two dead client-auth policies were dropped by 20260409. Re-asserting
-- the DROP IF EXISTS here is a no-op on any DB that has already applied
-- 20260409, and ensures fresh environments that somehow skipped 20260409
-- still end up clean.
DROP POLICY IF EXISTS "Clients can insert their own logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Clients can view their own logs" ON public.nutrition_logs;

-- 4. Performance: wrap auth.uid() in (SELECT ...) so Postgres evaluates it
-- once per statement instead of once per row scanned. See
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- for the Supabase-recommended pattern.
DROP POLICY IF EXISTS "PTs can insert logs for their clients" ON public.nutrition_logs;
CREATE POLICY "PTs can insert logs for their clients"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (trainer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "PTs can view logs for their clients" ON public.nutrition_logs;
CREATE POLICY "PTs can view logs for their clients"
  ON public.nutrition_logs FOR SELECT
  USING (trainer_id = (SELECT auth.uid()));

-- Same statement-scoped caching for the Phase L whatsapp_logs SELECT policy.
DROP POLICY IF EXISTS "Trainers read own whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Trainers read own whatsapp logs"
  ON public.whatsapp_logs FOR SELECT
  USING (trainer_id = (SELECT auth.uid()));
