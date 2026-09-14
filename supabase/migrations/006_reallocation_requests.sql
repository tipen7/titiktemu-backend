-- A UMKM user's request to relocate to a specific reallocation candidate
-- grid, submitted via POST /api/reallocation-requests after viewing
-- GET /api/reallocation candidates for their location. Surfaces for
-- operator review via GET/PATCH /api/reallocation-requests.
--
-- Named "reallocation_requests" deliberately -- NOT "laporan_alokasi" or
-- similar -- since that name is already used by the existing, unrelated
-- read-only /api/policy-recommendations feature (AI-generated narratives,
-- no user submission involved). Keep the two concepts distinct everywhere.
--
-- distance_m/matching_score/requested_district are snapshotted at
-- submission time (not re-joined live) since titiktemu-analytics' next
-- batch run can recompute reallocation_candidates with different values.
CREATE TABLE IF NOT EXISTS reallocation_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  origin_grid_id      TEXT NOT NULL REFERENCES spatial_grids(grid_id),
  requested_grid_id   TEXT NOT NULL REFERENCES spatial_grids(grid_id),
  requested_district  TEXT,
  distance_m          NUMERIC,
  matching_score      NUMERIC,
  note                TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reallocation_requests_status ON reallocation_requests (status);
CREATE INDEX IF NOT EXISTS idx_reallocation_requests_submitted_by ON reallocation_requests (submitted_by);
