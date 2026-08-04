/*
# DOT System: Add service_type to service_records

## Overview
Adds a `service_type` column to the `service_records` table so officers can mark
each fee record as either "ยึด" (impound/seizure) or "ปกติ" (normal service).

## Changes
- New column: service_type (text, NOT NULL, DEFAULT 'normal')
  - Values: 'normal' (ปกติ) | 'impound' (ยึด)
- CHECK constraint ensures only valid values

## Security
- No RLS policy changes (existing policies already cover the new column)
*/

ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'normal'
  CHECK (service_type IN ('normal', 'impound'));
