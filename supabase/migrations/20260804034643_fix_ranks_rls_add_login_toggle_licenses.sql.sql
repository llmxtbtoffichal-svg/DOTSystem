/*
# Fix officer_ranks RLS + Add login_enabled + licenses table

## Problem
The officer_ranks table only allows `authenticated` role to INSERT/UPDATE/DELETE.
This app uses the anon key (no Supabase Auth session), so all officer
rank management operations (add, edit, delete ranks) silently fail.

## Changes
1. Add anon INSERT/UPDATE/DELETE policies on officer_ranks (matching other tables)
2. Add `login_enabled` boolean column to system_settings (default true)
   - Allows commissioner to open/close the officer login system
3. Create `licenses` table for driver's license tracking
   - Citizens can search by Roblox/Discord username to check license status
*/

-- 1. Fix officer_ranks RLS
DROP POLICY IF EXISTS "select_ranks" ON officer_ranks;
DROP POLICY IF EXISTS "insert_ranks" ON officer_ranks;
DROP POLICY IF EXISTS "update_ranks" ON officer_ranks;
DROP POLICY IF EXISTS "delete_ranks" ON officer_ranks;

CREATE POLICY "anon_select_officer_ranks" ON officer_ranks FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_officer_ranks" ON officer_ranks FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_officer_ranks" ON officer_ranks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_officer_ranks" ON officer_ranks FOR DELETE
  TO anon, authenticated USING (true);

-- 2. Add login_enabled to system_settings
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS login_enabled boolean NOT NULL DEFAULT true;

-- 3. Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_username text NOT NULL,
  discord_username text,
  license_type text NOT NULL DEFAULT 'driver',
  license_number text,
  issue_date timestamptz DEFAULT now(),
  expiry_date timestamptz,
  status text NOT NULL DEFAULT 'active',
  issued_by uuid,
  issued_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_licenses" ON licenses FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_licenses" ON licenses FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_licenses" ON licenses FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_licenses" ON licenses FOR DELETE
  TO anon, authenticated USING (true);

-- 4. Fix complaints table: add missing columns used by the app
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS complainant_name text,
  ADD COLUMN IF NOT EXISTS complainant_contact text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'พฤติกรรม',
  ADD COLUMN IF NOT EXISTS description text;
