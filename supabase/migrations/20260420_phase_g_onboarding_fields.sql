-- ============================================================
-- Phase G — first-login onboarding checklist
-- ============================================================
-- Formalizes the onboarding columns already present in schema.sql.
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent.
--
-- The checklist tracks three steps per PT (client_added, availability_set,
-- link_shared). Existing rows default to onboarding_completed=false and
-- onboarding_steps='{}', then the one-time backfill below marks any PT who
-- already has at least one active client as already-completed — those PTs
-- should not see a brand-new onboarding checklist.

-- 1. Columns (no-op on fresh schema.sql; creates them on older DBs)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_steps jsonb NOT NULL DEFAULT '{}';

-- 2. One-time backfill: existing PTs with clients are already "onboarded".
--    Marks onboarding_completed = true (primary gate) AND stamps all three
--    step keys in onboarding_steps so any future feature that reads the
--    steps map sees a coherent "completed everything" record.
--    Idempotent: re-running sets rows to the same values.
UPDATE public.profiles
SET
  onboarding_completed = true,
  onboarding_steps = jsonb_build_object(
    'client_added', true,
    'availability_set', true,
    'link_shared', true
  )
WHERE onboarding_completed = false
  AND id IN (SELECT DISTINCT trainer_id FROM public.clients);
