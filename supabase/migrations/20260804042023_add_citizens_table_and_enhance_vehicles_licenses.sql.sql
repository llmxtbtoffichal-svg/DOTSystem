/*
# Create citizens table + enhance vehicles/licenses for citizen management

## Purpose
The commissioner needs a dedicated citizen data management system. This migration:
1. Creates a `citizens` table to store person-level data (Roblox/Discord usernames, status, notes)
2. Adds `brand_model` and `vehicle_category` columns to the `vehicles` table
3. Adds `citizen_id` foreign key to both `vehicles` and `licenses` tables (nullable, for linking)

## New Tables
- `citizens`
  - id (uuid, PK)
  - roblox_username (text, not null)
  - discord_username (text, nullable)
  - status (text: 'normal' | 'watched' | 'suspended', default 'normal')
  - notes (text, nullable — private notes about this citizen)
  - created_at, updated_at (timestamps)

## Modified Tables
- `vehicles`: add `brand_model` (text), `vehicle_category` (text: 'personal' | 'public' | 'transport'), `citizen_id` (uuid FK -> citizens)
- `licenses`: add `citizen_id` (uuid FK -> citizens)

## Security
- RLS enabled on `citizens` with anon+authenticated CRUD (single-tenant app, no Supabase Auth)
- All policies use `TO anon, authenticated` so the anon-key frontend can operate
*/

CREATE TABLE IF NOT EXISTS citizens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_username text NOT NULL,
  discord_username text,
  status text NOT NULL DEFAULT 'normal',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_citizens" ON citizens;
CREATE POLICY "anon_select_citizens" ON citizens FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_citizens" ON citizens;
CREATE POLICY "anon_insert_citizens" ON citizens FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_citizens" ON citizens;
CREATE POLICY "anon_update_citizens" ON citizens FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_citizens" ON citizens;
CREATE POLICY "anon_delete_citizens" ON citizens FOR DELETE
  TO anon, authenticated USING (true);

-- Add columns to vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS brand_model text,
  ADD COLUMN IF NOT EXISTS vehicle_category text DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS citizen_id uuid REFERENCES citizens(id) ON DELETE SET NULL;

-- Add citizen_id to licenses
ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS citizen_id uuid REFERENCES citizens(id) ON DELETE SET NULL;

-- Index for searching citizens by username
CREATE INDEX IF NOT EXISTS idx_citizens_roblox ON citizens(roblox_username);
CREATE INDEX IF NOT EXISTS idx_citizens_discord ON citizens(discord_username);
CREATE INDEX IF NOT EXISTS idx_vehicles_citizen_id ON vehicles(citizen_id);
CREATE INDEX IF NOT EXISTS idx_licenses_citizen_id ON licenses(citizen_id);
