/*
# DOT System: Add image_url to vehicles

## Overview
Adds an image_url column to the vehicles table so officers can upload
a photo of the vehicle when impounding it. Citizens will see this photo
when searching for their vehicle in the citizen portal.

## Changes
- ALTER TABLE vehicles ADD COLUMN image_url text (nullable)

## Security
- No RLS policy changes needed — existing policies already cover SELECT/UPDATE
*/

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url text;
