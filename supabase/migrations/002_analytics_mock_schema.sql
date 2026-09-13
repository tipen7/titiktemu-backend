-- Mock reconstruction of titiktemu-analytics' output schema.
--
-- titiktemu-analytics is a separate Python batch pipeline, not present in
-- this workspace, that is supposed to own and populate these tables for
-- real (spatial_grids, gentrification_risk_scores, policy_recommendations,
-- reallocation_candidates, spatial_grids_geojson, umkm_businesses,
-- dashboard_summary). This schema is inferred purely from the SQL this
-- repo's own src/repositories/index.ts already runs against those table
-- names -- it is a best-effort guess for local development/demo, NOT
-- sourced from titiktemu-analytics itself. Replace this migration with
-- titiktemu-analytics' real schema once that repo is wired up; until then,
-- 003_analytics_mock_seed.sql seeds it with mock data so the gateway's
-- read-model endpoints have something to serve locally.

CREATE TABLE IF NOT EXISTS spatial_grids (
  grid_id text PRIMARY KEY,
  district_name text,
  kecamatan text,
  geom geometry(Polygon, 32748) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spatial_grids_geom ON spatial_grids USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_spatial_grids_district ON spatial_grids (district_name);

CREATE TABLE IF NOT EXISTS gentrification_risk_scores (
  grid_id text PRIMARY KEY REFERENCES spatial_grids (grid_id) ON DELETE CASCADE,
  ews_code smallint NOT NULL CHECK (ews_code IN (0, 1, 2)),
  vulnerability_index numeric NOT NULL,
  matching_score numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_recommendations (
  grid_id text PRIMARY KEY REFERENCES spatial_grids (grid_id) ON DELETE CASCADE,
  narrative text,
  recommendation_type text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spatial_grids_geojson (
  grid_id text PRIMARY KEY REFERENCES spatial_grids (grid_id) ON DELETE CASCADE,
  feature jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS reallocation_candidates (
  id bigserial PRIMARY KEY,
  origin_grid_id text NOT NULL REFERENCES spatial_grids (grid_id) ON DELETE CASCADE,
  rank int NOT NULL,
  recommended_grid_id text NOT NULL REFERENCES spatial_grids (grid_id),
  recommended_district text,
  distance_m numeric NOT NULL,
  matching_score numeric NOT NULL,
  crossed_district boolean NOT NULL DEFAULT false,
  UNIQUE (origin_grid_id, rank)
);

CREATE TABLE IF NOT EXISTS umkm_businesses (
  id text PRIMARY KEY,
  name text,
  category text,
  grid_id text REFERENCES spatial_grids (grid_id),
  district_name text,
  kecamatan text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  dist_to_station_m numeric,
  reference_price_per_txn_idr numeric,
  data_confidence numeric,
  source text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_umkm_businesses_district ON umkm_businesses (district_name);
CREATE INDEX IF NOT EXISTS idx_umkm_businesses_grid ON umkm_businesses (grid_id);

-- Append-only: one row per analytics batch run.
CREATE TABLE IF NOT EXISTS dashboard_summary (
  id bigserial PRIMARY KEY,
  metrics jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
