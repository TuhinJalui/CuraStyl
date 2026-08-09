-- ============================================================
-- ADD MAP FIELDS TO SALONS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add google_maps_url column if it doesn't already exist
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- 2. Update existing salons with realistic Mumbai lat/lng coordinates
--    and Google Maps URLs.
--    Replace the slug values below with actual slugs from your salons table.
--    Run: SELECT id, slug, name FROM public.salons; to list your salons.

-- NOTE: The UPDATE statements below use the slug to identify each salon.
-- Replace slugs as needed to match your actual data.

-- Generic helper – updates lat, lng AND google_maps_url together
-- so that even salons without a slug match still get a Maps URL derived
-- from their existing coordinates.

-- First: update salons that already have lat & lng but no google_maps_url
UPDATE public.salons
SET google_maps_url = 'https://www.google.com/maps/search/?api=1&query=' || lat::TEXT || ',' || lng::TEXT
WHERE lat IS NOT NULL
  AND lng IS NOT NULL
  AND (google_maps_url IS NULL OR google_maps_url = '');

-- ── Bandra area salons ─────────────────────────────────────
UPDATE public.salons
SET lat = 19.0596, lng = 72.8295,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.0596,72.8295'
WHERE slug = 'bandra-glow-salon' AND (lat IS NULL OR lat = 0);

UPDATE public.salons
SET lat = 19.0544, lng = 72.8322,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.0544,72.8322'
WHERE slug = 'bandra-beauty-studio' AND (lat IS NULL OR lat = 0);

-- ── Andheri area salons ────────────────────────────────────
UPDATE public.salons
SET lat = 19.1136, lng = 72.8697,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.1136,72.8697'
WHERE slug = 'andheri-style-hub' AND (lat IS NULL OR lat = 0);

UPDATE public.salons
SET lat = 19.1197, lng = 72.8468,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.1197,72.8468'
WHERE slug = 'andheri-glamour-lounge' AND (lat IS NULL OR lat = 0);

-- ── Juhu area salons ───────────────────────────────────────
UPDATE public.salons
SET lat = 19.1019, lng = 72.8268,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.1019,72.8268'
WHERE slug = 'juhu-beach-salon' AND (lat IS NULL OR lat = 0);

-- ── Colaba area salons ─────────────────────────────────────
UPDATE public.salons
SET lat = 18.9067, lng = 72.8147,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=18.9067,72.8147'
WHERE slug = 'colaba-luxury-salon' AND (lat IS NULL OR lat = 0);

-- ── Powai area salons ──────────────────────────────────────
UPDATE public.salons
SET lat = 19.1197, lng = 72.9052,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.1197,72.9052'
WHERE slug = 'powai-salon-and-spa' AND (lat IS NULL OR lat = 0);

-- ── Dadar area salons ──────────────────────────────────────
UPDATE public.salons
SET lat = 19.0178, lng = 72.8478,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.0178,72.8478'
WHERE slug = 'dadar-style-studio' AND (lat IS NULL OR lat = 0);

-- ── Worli area salons ──────────────────────────────────────
UPDATE public.salons
SET lat = 19.0176, lng = 72.8178,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.0176,72.8178'
WHERE slug = 'worli-beauty-lounge' AND (lat IS NULL OR lat = 0);

-- ── Malad area salons ──────────────────────────────────────
UPDATE public.salons
SET lat = 19.1870, lng = 72.8480,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.1870,72.8480'
WHERE slug = 'malad-glam-studio' AND (lat IS NULL OR lat = 0);

-- ── Fallback: any salon still missing lat/lng gets Mumbai center coords
--    so the map still renders (can be refined later by salon owners)
UPDATE public.salons
SET lat = 19.0760, lng = 72.8777,
    google_maps_url = 'https://www.google.com/maps/search/?api=1&query=' ||
                      encode(convert_to(name || ' ' || address || ' Mumbai', 'UTF8'), 'escape')
WHERE (lat IS NULL OR lat = 0 OR lng IS NULL OR lng = 0);

-- ── Simpler fallback without encode (more compatible) ─────
-- If the above throws an error on your Supabase instance, use this instead:
-- UPDATE public.salons
-- SET lat = 19.0760, lng = 72.8777,
--     google_maps_url = 'https://www.google.com/maps/search/?api=1&query=19.0760,72.8777'
-- WHERE (lat IS NULL OR lat = 0 OR lng IS NULL OR lng = 0);

-- ── Verify ────────────────────────────────────────────────
SELECT id, name, slug, lat, lng, google_maps_url
FROM public.salons
ORDER BY name;
