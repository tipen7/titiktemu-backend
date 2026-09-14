-- UMKM self-reported survey submissions -- a UMKM user's own business data
-- (rent, revenue, tenant info), submitted via POST /api/umkm-self-reports.
--
-- This is a NEW, standalone table -- it deliberately does NOT reuse or
-- repurpose 001_init.sql's `umkm_report` table, which is a dead Fase-0
-- skeleton (bigint FK to the unused `grid` table, generic jsonb payload,
-- no validator/route touches it) and is the partner's foundation to decide
-- the fate of, not this feature's to hijack.
--
-- Columns mirror the real survey fields titiktemu-analytics' batch pipeline
-- ingests (see that repo's src/ingestion/umkm_survey.py: tenant_type,
-- period/rent format "13 juta/bulan", transaction_per_day high/normal/low
-- split, revenue_per_month, rent_trend, rent_expiry_date) so a submission
-- here can later be folded into that pipeline's survey CSV without a
-- reshaping step. No FK to spatial_grids -- grid assignment happens inside
-- the analytics pipeline itself (assign_grid_coords()), not here.
CREATE TABLE IF NOT EXISTS umkm_self_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  business_name               TEXT NOT NULL,
  description                 TEXT,
  tenant_type                 TEXT CHECK (tenant_type IN ('umkm_tetap', 'umkm_seasonal', 'franchise_tetap', 'franchise_seasonal')),
  latitude                    DOUBLE PRECISION NOT NULL,
  longitude                   DOUBLE PRECISION NOT NULL,
  tenant_area_m2              NUMERIC,
  target_market               TEXT,
  rent_price_amount           NUMERIC,
  rent_period_unit            TEXT CHECK (rent_period_unit IN ('hari', 'bulan', 'tahun')),
  rent_expiry_date            DATE,
  revenue_per_month_idr       NUMERIC,
  txn_high_idr                NUMERIC,
  txn_normal_idr              NUMERIC,
  txn_low_idr                 NUMERIC,
  transaction_per_buyer_idr   NUMERIC,
  rent_trend_pct              NUMERIC,
  status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'exported')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umkm_self_reports_status ON umkm_self_reports (status);
CREATE INDEX IF NOT EXISTS idx_umkm_self_reports_submitted_by ON umkm_self_reports (submitted_by);
