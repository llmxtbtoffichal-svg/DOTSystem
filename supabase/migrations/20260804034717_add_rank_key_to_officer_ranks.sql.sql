/*
# Add rank_key to officer_ranks

## Purpose
The officers.rank column stores machine keys like 'commissioner', 'inspector', 'officer'.
The officer_ranks table stores display labels like 'หัวหน้ากรมขนส่ง'.
When creating/editing officers through the management UI, the form uses the label
but the officers.rank column needs the machine key.

This migration adds a `rank_key` column to officer_ranks so each rank record
has both a machine key and a display label. Existing records get default
keys based on their sort_order.
*/

ALTER TABLE officer_ranks
  ADD COLUMN IF NOT EXISTS rank_key text;

-- Populate existing records with default keys
UPDATE officer_ranks SET rank_key = 'commissioner' WHERE sort_order = 1 AND rank_key IS NULL;
UPDATE officer_ranks SET rank_key = 'inspector' WHERE sort_order = 2 AND rank_key IS NULL;
UPDATE officer_ranks SET rank_key = 'officer' WHERE sort_order = 3 AND rank_key IS NULL;
-- Any remaining records get a derived key from their label
UPDATE officer_ranks SET rank_key = lower(replace(label, ' ', '_')) WHERE rank_key IS NULL;
