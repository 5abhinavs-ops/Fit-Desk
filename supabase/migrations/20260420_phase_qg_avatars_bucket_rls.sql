-- ============================================================
-- Consolidated quality gate — avatars bucket storage RLS
-- ============================================================
-- Security-reviewer flagged (HIGH) that profile-photo uploads go directly
-- from the browser client to Supabase Storage. Without a bucket-level RLS
-- policy scoping writes to the uploader's own folder, an authenticated
-- user could PUT to another user's avatar path and overwrite it.
--
-- This migration enforces ownership at the storage layer so even a
-- client that bypasses our component can only write to their own
-- `${auth.uid()}/...` prefix. Read access stays public so booking pages
-- can render photos without a signed URL round-trip.
--
-- Idempotent: IF NOT EXISTS on bucket insert + DROP IF EXISTS before
-- CREATE POLICY. Safe to re-run.

-- 1. Ensure the avatars bucket exists and is public-read.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Public SELECT — profile photos are shown on public booking pages.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 3. Owner-only INSERT — the first folder segment must equal auth.uid().
DROP POLICY IF EXISTS "Owners upload own avatar" ON storage.objects;
CREATE POLICY "Owners upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 4. Owner-only UPDATE — same scope (upsert path re-uses the existing row).
DROP POLICY IF EXISTS "Owners update own avatar" ON storage.objects;
CREATE POLICY "Owners update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- 5. Owner-only DELETE — defence-in-depth for future features.
DROP POLICY IF EXISTS "Owners delete own avatar" ON storage.objects;
CREATE POLICY "Owners delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
