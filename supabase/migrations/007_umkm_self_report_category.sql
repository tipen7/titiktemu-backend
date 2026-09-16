-- Adds `category` (business type: kuliner/jasa/retail/etc.) to
-- umkm_self_reports. Distinct from `tenant_type` (umkm_tetap/
-- umkm_seasonal/franchise_tetap/franchise_seasonal), which describes
-- the tenancy arrangement, not what the business actually sells.
--
-- The frontend's self-tracker-form.tsx already collects this field
-- ("Kategori") but was discarding it client-side (only used for its own
-- form-completeness check, never sent to the API) since no backend column
-- existed for it. This migration is the fix.
ALTER TABLE umkm_self_reports
  ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('makanan-ringan', 'kuliner', 'kerajinan', 'jasa', 'dagang-retail', 'lainnya'));
