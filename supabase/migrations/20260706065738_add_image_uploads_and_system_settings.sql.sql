/*
# DOT System: Image Uploads, System Settings, Force Checkout Logging

## Overview
Adds image upload support for announcements, officer profiles, and service record evidence.
Introduces a system_settings table for the duty system toggle (Commissioner control).
Enhances duty_logs with forced-checkout audit metadata.

## Changes

### 1. announcements — new column
- image_url (text, nullable): URL to an attached image (stored in Supabase Storage)

### 2. officers — new column
- photo_url (text, nullable): URL to the officer's profile photo (stored in Supabase Storage)

### 3. service_records — new column
- evidence_url (text, nullable): URL to an evidence image (slip, receipt, photo) attached to the record

### 4. duty_logs — new columns
- forced_by (uuid, nullable): officer id of the Commissioner who forced checkout
- forced_by_name (text, nullable): name of the Commissioner who forced checkout
- checkout_method (text, nullable): 'self' | 'forced' — how the checkout happened

### 5. system_settings — NEW TABLE
Stores global system toggles controlled by the Commissioner.
- id (int, primary key, always 1 — singleton row)
- duty_system_enabled (boolean, default true): master toggle for clock-in/out
- updated_at (timestamptz)
- updated_by (uuid, nullable): officer id
- updated_by_name (text, nullable): officer name

### 6. Storage Bucket
- Creates a public storage bucket "dot-uploads" for announcement images, officer photos, and evidence images.

## Security
- All new columns are nullable — no data loss for existing rows.
- system_settings uses the same anon+authenticated RLS pattern as existing tables (custom auth).
- Storage bucket is public-read so images display without auth; writes are via anon key.
*/

-- ============================================================
-- ANNOUNCEMENTS: add image_url
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'announcements' AND column_name = 'image_url') THEN
    ALTER TABLE announcements ADD COLUMN image_url text;
  END IF;
END $$;

-- ============================================================
-- OFFICERS: add photo_url
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'officers' AND column_name = 'photo_url') THEN
    ALTER TABLE officers ADD COLUMN photo_url text;
  END IF;
END $$;

-- ============================================================
-- SERVICE RECORDS: add evidence_url
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_records' AND column_name = 'evidence_url') THEN
    ALTER TABLE service_records ADD COLUMN evidence_url text;
  END IF;
END $$;

-- ============================================================
-- DUTY LOGS: add forced checkout metadata
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duty_logs' AND column_name = 'forced_by') THEN
    ALTER TABLE duty_logs ADD COLUMN forced_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duty_logs' AND column_name = 'forced_by_name') THEN
    ALTER TABLE duty_logs ADD COLUMN forced_by_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duty_logs' AND column_name = 'checkout_method') THEN
    ALTER TABLE duty_logs ADD COLUMN checkout_method text DEFAULT 'self';
  END IF;
END $$;

-- ============================================================
-- SYSTEM SETTINGS — singleton table
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id int PRIMARY KEY DEFAULT 1,
  duty_system_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid,
  updated_by_name text
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_system_settings" ON system_settings;
CREATE POLICY "anon_select_system_settings" ON system_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_system_settings" ON system_settings;
CREATE POLICY "anon_insert_system_settings" ON system_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_system_settings" ON system_settings;
CREATE POLICY "anon_update_system_settings" ON system_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed the singleton row
INSERT INTO system_settings (id, duty_system_enabled) VALUES (1, true)
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE BUCKET: dot-uploads (public)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('dot-uploads', 'dot-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anon+authenticated to upload/read
-- (app uses custom auth, so we rely on anon key for all operations)
DROP POLICY IF EXISTS "anon_upload_dot_uploads" ON storage.objects;
CREATE POLICY "anon_upload_dot_uploads" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'dot-uploads');

DROP POLICY IF EXISTS "anon_read_dot_uploads" ON storage.objects;
CREATE POLICY "anon_read_dot_uploads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'dot-uploads');

DROP POLICY IF EXISTS "anon_delete_dot_uploads" ON storage.objects;
CREATE POLICY "anon_delete_dot_uploads" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'dot-uploads');
