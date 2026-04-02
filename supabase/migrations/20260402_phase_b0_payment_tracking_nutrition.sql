-- ============================================================
-- Phase B-0: Payment tracking columns + nutrition_logs table
-- ============================================================

-- 1. Payment details on profiles (PT fills once)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paynow_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS payment_reminder_default_days integer NOT NULL DEFAULT 3;

-- 2. Payment tracking on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'client_confirmed', 'paid', 'waived')),
  ADD COLUMN IF NOT EXISTS payment_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS client_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS pt_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz;

-- 3. Per-client payment reminder frequency
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS payment_reminder_days integer;

-- 4. Nutrition logs table
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

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_client_id
  ON public.nutrition_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_trainer_id
  ON public.nutrition_logs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_logged_at
  ON public.nutrition_logs(logged_at DESC);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert their own logs"
  ON public.nutrition_logs FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can view their own logs"
  ON public.nutrition_logs FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "PTs can view logs for their clients"
  ON public.nutrition_logs FOR SELECT
  USING (trainer_id = auth.uid());
