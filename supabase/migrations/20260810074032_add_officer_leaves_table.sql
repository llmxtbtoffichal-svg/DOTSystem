/*
# Add Officer Leaves Table

1. New Tables
- `officer_leaves`
  - `id` (uuid, primary key)
  - `officer_id` (uuid, references officers.id, nullable for legacy data)
  - `officer_name` (text, denormalized for display)
  - `leave_type` (text): 'sick' | 'personal' | 'vacation' | 'maternity' | 'ordained' | 'other'
  - `start_date` (date): when the leave begins
  - `end_date` (date): when the leave ends (inclusive)
  - `status` (text): 'pending' | 'approved' | 'rejected' | 'cancelled'
  - `reason` (text, nullable): explanation from the officer
  - `reviewed_by` (uuid, nullable): the commissioner who approved/rejected
  - `reviewed_by_name` (text, nullable)
  - `reviewed_at` (timestamptz, nullable)
  - `review_note` (text, nullable): commissioner's note when approving/rejecting
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `officer_leaves`.
- Allow `anon, authenticated` full CRUD — the app uses officer login at the app level
  (custom officers table, not Supabase auth), so all DB access goes through the anon key.
  This is intentionally shared data within the officer system.
*/

CREATE TABLE IF NOT EXISTS officer_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid REFERENCES officers(id) ON DELETE SET NULL,
  officer_name text NOT NULL DEFAULT '',
  leave_type text NOT NULL DEFAULT 'other',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE officer_leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leaves" ON officer_leaves;
CREATE POLICY "anon_select_leaves" ON officer_leaves FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaves" ON officer_leaves;
CREATE POLICY "anon_insert_leaves" ON officer_leaves FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_leaves" ON officer_leaves;
CREATE POLICY "anon_update_leaves" ON officer_leaves FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_leaves" ON officer_leaves;
CREATE POLICY "anon_delete_leaves" ON officer_leaves FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_officer_leaves_officer_id ON officer_leaves(officer_id);
CREATE INDEX IF NOT EXISTS idx_officer_leaves_status ON officer_leaves(status);
CREATE INDEX IF NOT EXISTS idx_officer_leaves_dates ON officer_leaves(start_date, end_date);