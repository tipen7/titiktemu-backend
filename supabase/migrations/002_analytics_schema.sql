-- Real schema for the analytics pipeline's output -- the tables this app
-- actually runs on (spatial_grids, gentrification_risk_scores,
-- policy_recommendations, reallocation_candidates, umkm_businesses,
-- dashboard_summary). These were created directly against the shared dev
-- database by titiktemu-analytics' ensure_schema() (see that repo's
-- src/persistence/writer.py) as a local-dev convenience, but were never
-- captured here -- so a fresh Supabase project or `docker-compose up`
-- (which seeds from this migrations/ folder, see docker-compose.yml) would
-- get 001_init.sql's older skeletal schema (users/grid/umkm_report) and
-- NONE of the tables the running app actually queries.
--
-- This migration captures that live schema as of the current analytics
-- pipeline run (v3+v5 survey training, CV-bandwidth GWR, 64.7% real
-- accuracy) so this repo's migrations match reality. Column shapes were
-- read directly off the live database via information_schema, not
-- reconstructed from memory.
--
-- Deliberately does NOT touch 001_init.sql or its `users` table -- that's
-- the partner's in-progress auth work, out of scope here.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS spatial_grids (
  grid_id                     TEXT PRIMARY KEY,
  geom                        GEOMETRY(Polygon, 32748),
  poi_count                   INTEGER,
  dist_to_station_m           NUMERIC,
  ndbi_mean                   NUMERIC,
  district_name               TEXT,
  within_walk_isochrone       SMALLINT,
  builtup_pct                 NUMERIC,
  kecamatan                   TEXT,
  population                  INTEGER,
  population_density_per_km2  NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_spatial_grids_geom ON spatial_grids USING GIST (geom);

CREATE TABLE IF NOT EXISTS gentrification_risk_scores (
  grid_id             TEXT PRIMARY KEY REFERENCES spatial_grids(grid_id),
  vulnerability_index NUMERIC,
  ews_code            SMALLINT,
  matching_score      NUMERIC,
  computed_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_recommendations (
  grid_id               TEXT PRIMARY KEY REFERENCES spatial_grids(grid_id),
  narrative             TEXT,
  recommendation_type   TEXT,
  ai_generated          BOOLEAN DEFAULT true,
  requires_human_review BOOLEAN DEFAULT true,
  generated_at          TIMESTAMPTZ DEFAULT now()
);

-- Batch-precomputed reallocation candidates -- the backend's "live"
-- reallocation lookup is a single SELECT ... WHERE origin_grid_id = ...,
-- no Python/compute at request time (see the analytics repo's zones.py).
CREATE TABLE IF NOT EXISTS reallocation_candidates (
  origin_grid_id       TEXT REFERENCES spatial_grids(grid_id),
  rank                 SMALLINT,
  recommended_grid_id  TEXT REFERENCES spatial_grids(grid_id),
  recommended_district TEXT,
  distance_m           NUMERIC,
  matching_score       NUMERIC,
  crossed_district     BOOLEAN,
  search_radius_used_m NUMERIC,
  expansions_needed    SMALLINT,
  computed_at          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (origin_grid_id, rank)
);

-- Individual real UMKM business records (Discovery Map favorites, UMKM
-- Self-Tracker, Smart Tenant Matching) -- sourced from the real survey data
-- the model trains on (`source` = 'v3' or 'v5'; 'v4' was retired -- its
-- revenue field was a disclosed mechanical proxy, not an independent
-- measurement). Deliberately excludes raw rent/revenue -- only a single
-- reference transaction value plus the grid's own already-public risk status.
CREATE TABLE IF NOT EXISTS umkm_businesses (
  id                          TEXT PRIMARY KEY,
  name                        TEXT,
  category                    TEXT,
  grid_id                     TEXT REFERENCES spatial_grids(grid_id),
  district_name               TEXT,
  kecamatan                   TEXT,
  latitude                    NUMERIC,
  longitude                   NUMERIC,
  dist_to_station_m           NUMERIC,
  reference_price_per_txn_idr NUMERIC,
  data_confidence             NUMERIC,
  source                      TEXT,
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_umkm_businesses_grid_id ON umkm_businesses (grid_id);

-- One row per pipeline run -- the dashboard's model-accuracy/zone-summary
-- endpoints read the most recent row by computed_at. `metrics` mirrors
-- titiktemu-analytics' compute_dashboard_metrics() output verbatim.
CREATE TABLE IF NOT EXISTS dashboard_summary (
  id          SERIAL PRIMARY KEY,
  metrics     JSONB,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Per the PRD's "no tile server, serve compressed GeoJSON directly from
-- PostGIS" decision -- the backend's map-layer endpoint reads this view
-- instead of hand-writing ST_AsGeoJSON/ST_Transform per query.
CREATE OR REPLACE VIEW spatial_grids_geojson AS
SELECT
    g.grid_id,
    json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Transform(g.geom, 4326))::json,
        'properties', json_build_object(
            'grid_id', g.grid_id,
            'district_name', g.district_name,
            'kecamatan', g.kecamatan,
            'poi_count', g.poi_count,
            'ews_code', r.ews_code,
            'vulnerability_index', r.vulnerability_index,
            'matching_score', r.matching_score
        )
    ) AS feature
FROM spatial_grids g
LEFT JOIN gentrification_risk_scores r ON r.grid_id = g.grid_id;
