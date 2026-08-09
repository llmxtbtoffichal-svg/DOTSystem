/*
# Add citizen_id to service_records

## Purpose
Link service fee records to citizens for the citizen management system.

## Changes
- Add `citizen_id` column (nullable uuid FK -> citizens) to `service_records`
- Add index on `citizen_id` for efficient lookups
*/

ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS citizen_id uuid REFERENCES citizens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_records_citizen_id ON service_records(citizen_id);
