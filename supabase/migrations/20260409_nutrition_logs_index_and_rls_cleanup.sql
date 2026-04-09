-- ============================================================
-- Nutrition logs: composite index + RLS policy cleanup
-- ============================================================

-- 1. Composite index for PT dashboard queries (filter trainer + sort by date)
--    Supersedes the two single-column indexes on trainer_id and logged_at
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_trainer_logged
  ON public.nutrition_logs (trainer_id, logged_at DESC);

DROP INDEX IF EXISTS idx_nutrition_logs_trainer_id;
DROP INDEX IF EXISTS idx_nutrition_logs_logged_at;

-- 2. Drop dead client-auth RLS policies
--    FitDesk clients never have Supabase Auth accounts — these never match
DROP POLICY IF EXISTS "Clients can insert their own logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Clients can view their own logs" ON public.nutrition_logs;

-- 3. Add trainer INSERT policy (was missing — inserts rely on trainer auth, not client auth)
CREATE POLICY "PTs can insert logs for their clients"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (trainer_id = auth.uid());
