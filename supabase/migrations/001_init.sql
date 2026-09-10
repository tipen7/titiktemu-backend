-- Fase 0: skeletal schema. Fase 1 will extend `grid` (or add a linked
-- `master_grid_dataset` table) with poi_count, ndbi_mean, dist_to_station, etc.
-- Do not add those columns here.

CREATE EXTENSION IF NOT EXISTS postgis;

-- 'public_user' is used instead of the doc's literal 'public' to avoid
-- confusion with the reserved Postgres schema name `public`.
CREATE TYPE user_role AS ENUM ('pemda_admin', 'operator_tod', 'umkm', 'public_user');

CREATE TYPE report_status AS ENUM ('pending', 'verified', 'rejected');

-- Self-contained for Fase 0 local dev (Docker Compose has no Supabase `auth`
-- schema). Revisit FK to auth.users(id) once Supabase Auth strategy is confirmed.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text,
  role user_role NOT NULL DEFAULT 'public_user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Skeletal grid: geometry only. Doc specifies 250x250m cells, EPSG:32748.
-- Feature columns (poi_count, ndbi_mean, ...) are a Fase 1 concern.
CREATE TABLE grid (
  grid_id bigserial PRIMARY KEY,
  geom geometry(Polygon, 32748) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grid_geom ON grid USING GIST (geom);

CREATE TABLE umkm_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id bigint REFERENCES grid (grid_id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES users (id) ON DELETE SET NULL,
  business_name text NOT NULL,
  category text NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  -- Needed to spatially resolve grid_id for a submitted report.
  location geometry(Point, 32748),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_umkm_report_grid_id ON umkm_report (grid_id);
CREATE INDEX idx_umkm_report_submitted_by ON umkm_report (submitted_by);
CREATE INDEX idx_umkm_report_status ON umkm_report (status);
CREATE INDEX idx_umkm_report_location ON umkm_report USING GIST (location);
