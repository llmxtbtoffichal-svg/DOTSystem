/*
# DOT System: Vehicle Registry & Impound Check

## Overview
Adds a vehicle registry so citizens and officers can look up any vehicle by license plate
and immediately see whether it has been impounded ("นึด") by the DOT.
Officers can register vehicles, mark them as impounded with reason/location,
and release them. Citizens can search by plate number from the public portal.

## New Table: vehicles
- id: UUID primary key
- license_plate: Vehicle license plate (required, unique) — the lookup key
- owner_name: Registered owner name (optional)
- vehicle_type: 'sedan' | 'suv' | 'pickup' | 'motorcycle' | 'truck' | 'van' | 'other'
- color: Vehicle color (optional)
- is_impounded: Boolean — true when vehicle is currently impounded
- impound_reason: Reason for impound (nullable)
- impound_location: Where the vehicle is being held (nullable)
- impounded_at: Timestamp of impound action (nullable)
- impounded_by: Officer id who impounded (nullable)
- impounded_by_name: Officer name who impounded (nullable)
- released_at: Timestamp of release (nullable)
- released_by: Officer id who released (nullable)
- released_by_name: Officer name who released (nullable)
- notes: Additional notes (nullable)
- created_at, updated_at: Timestamps

## Security
- RLS enabled, anon + authenticated can SELECT (public lookup)
- INSERT/UPDATE/DELETE restricted to authenticated (officers only)
*/

CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate text NOT NULL UNIQUE,
  owner_name text,
  vehicle_type text NOT NULL DEFAULT 'other' CHECK (vehicle_type IN ('sedan','suv','pickup','motorcycle','truck','van','other')),
  color text,
  is_impounded boolean NOT NULL DEFAULT false,
  impound_reason text,
  impound_location text,
  impounded_at timestamptz,
  impounded_by uuid REFERENCES officers(id) ON DELETE SET NULL,
  impounded_by_name text,
  released_at timestamptz,
  released_by uuid REFERENCES officers(id) ON DELETE SET NULL,
  released_by_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles (license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_impounded ON vehicles (is_impounded);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vehicles" ON vehicles;
CREATE POLICY "anon_select_vehicles" ON vehicles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_vehicles" ON vehicles;
CREATE POLICY "auth_insert_vehicles" ON vehicles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_vehicles" ON vehicles;
CREATE POLICY "auth_update_vehicles" ON vehicles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_vehicles" ON vehicles;
CREATE POLICY "auth_delete_vehicles" ON vehicles FOR DELETE
  TO authenticated USING (true);
