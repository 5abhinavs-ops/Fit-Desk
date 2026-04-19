-- ============================================================
-- Phase L — WhatsApp automation log + opt-out flag
-- ============================================================
-- New table `whatsapp_logs` captures every send attempt (success,
-- opt-out suppression, or failure). Trainers see their own rows only.
-- Append-only: no UPDATE / DELETE policies for trainer role.
--
-- Column `whatsapp_opted_out` on clients is set to true when Meta's
-- error response indicates the recipient has opted out (error code
-- 131047 or message containing "opt out"). The send pipeline then
-- suppresses subsequent sends to that client without hitting the API.

-- 1. Automation log table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('sent', 'suppressed_opt_out', 'failed'))
);

-- Index for the PT's "recent automations" query
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_trainer_sent
  ON public.whatsapp_logs (trainer_id, sent_at DESC);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own logs
DROP POLICY IF EXISTS "Trainers read own whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Trainers read own whatsapp logs"
  ON public.whatsapp_logs
  FOR SELECT
  USING (trainer_id = auth.uid());

-- Inserts happen via service role (sendTemplateMessage). No trainer-level
-- INSERT policy is required; append-only for trainers.

-- 2. Opt-out flag on clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp_opted_out boolean NOT NULL DEFAULT false;
