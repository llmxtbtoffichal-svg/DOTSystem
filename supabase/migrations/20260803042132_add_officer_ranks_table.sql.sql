/*
# DOT System: Custom officer ranks table

## Overview
Creates a new `officer_ranks` table so the commissioner can add/edit/delete
custom positions (ranks) for officers, rather than being limited to the
hardcoded set of commissioner/inspector/officer.

## Changes
- New table: officer_ranks
  - id (uuid PK)
  - label (text, unique, NOT NULL) — display name e.g. "หัวหน้ากรมขนส่ง"
  - sort_order (int, NOT NULL, DEFAULT 0) — lower = higher authority
  - is_active (bool, NOT NULL, DEFAULT true)
  - created_at, updated_at (timestamptz)

- Seeds initial ranks matching existing hardcoded values

- Alters officers.rank column: drops the old enum constraint so any text
  value is accepted (the label string itself is stored).

## Security
- RLS enabled, TO authenticated
- SELECT: any authenticated officer can see ranks
- INSERT/UPDATE/DELETE: only commissioner (rank = 'commissioner')
*/

CREATE TABLE IF NOT EXISTS officer_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE officer_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_ranks" ON officer_ranks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_ranks" ON officer_ranks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM officers o WHERE o.id = auth.uid() AND o.rank = 'commissioner')
  );

CREATE POLICY "update_ranks" ON officer_ranks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM officers o WHERE o.id = auth.uid() AND o.rank = 'commissioner')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM officers o WHERE o.id = auth.uid() AND o.rank = 'commissioner')
  );

CREATE POLICY "delete_ranks" ON officer_ranks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM officers o WHERE o.id = auth.uid() AND o.rank = 'commissioner')
  );

-- Seed initial ranks
INSERT INTO officer_ranks (label, sort_order) VALUES
  ('หัวหน้ากรมขนส่ง', 1),
  ('ผู้คุมสอบกรมขนส่ง', 2),
  ('พนักงาน', 3)
ON CONFLICT (label) DO NOTHING;

-- Drop the old CHECK constraint on officers.rank if it exists
-- and allow any text value (the label string)
DO $$
BEGIN
  -- Find and drop any constraint that limits rank values
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'officers' AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE officers DROP CONSTRAINT IF EXISTS officers_rank_check;
  END IF;
END $$;
