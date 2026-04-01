-- À exécuter une fois dans Supabase (SQL Editor) avant fetch-coordinates.mjs
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

