/*
# DOT System: Add anon write policies for vehicles

## Problem
The vehicles table only allows `authenticated` role to INSERT/UPDATE/DELETE.
This app uses the anon key (no Supabase Auth session), so all officer
write operations (add, impound, release, delete vehicles) silently fail.

## Fix
Add anon INSERT/UPDATE/DELETE policies matching the existing pattern
used by other tables in this no-auth app (announcements, service_records, etc).
*/

CREATE POLICY "anon_insert_vehicles" ON vehicles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_update_vehicles" ON vehicles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_vehicles" ON vehicles FOR DELETE
  TO anon, authenticated USING (true);
