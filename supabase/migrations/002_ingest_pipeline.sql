-- Fase 1 (Minggu 1): batch ingest landing zone. Raw external records land
-- here first; a later ETL/spatial-join step transforms them into
-- `master_grid_dataset` (not created yet — see 001_init.sql's `grid` note).

CREATE TYPE ingest_job_status AS ENUM ('running', 'success', 'failed');

CREATE TABLE ingest_job_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  job_name text NOT NULL,
  status ingest_job_status NOT NULL DEFAULT 'running',
  records_ingested integer NOT NULL DEFAULT 0,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX idx_ingest_job_log_source ON ingest_job_log (source);

-- MAPID ecosystem (Struk Go, Menu Go, Properti Go). Populated today by
-- MockMapidAdapter (Asumsi A3 — real contract unconfirmed); the schema is
-- generic enough that a real adapter can write here unchanged.
CREATE TYPE mapid_dataset AS ENUM ('struk_go', 'menu_go', 'properti_go');

CREATE TABLE mapid_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES ingest_job_log (id) ON DELETE SET NULL,
  dataset mapid_dataset NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  location geometry(Point, 4326),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset, external_id)
);

CREATE INDEX idx_mapid_staging_location ON mapid_staging USING GIST (location);

-- OSM (Overpass API) road network + POI extraction.
CREATE TABLE osm_road (
  osm_id bigint PRIMARY KEY,
  job_id uuid REFERENCES ingest_job_log (id) ON DELETE SET NULL,
  road_type text NOT NULL,
  name text,
  geom geometry(LineString, 4326) NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_osm_road_geom ON osm_road USING GIST (geom);

CREATE TABLE osm_poi (
  osm_id bigint PRIMARY KEY,
  job_id uuid REFERENCES ingest_job_log (id) ON DELETE SET NULL,
  poi_type text NOT NULL,
  name text,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(Point, 4326) NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_osm_poi_geom ON osm_poi USING GIST (geom);

-- Sentinel-2 NDBI. Real computation needs a Python geospatial stack
-- (rasterio/eodag per the risk register) that doesn't exist in this repo
-- yet — this table is the landing zone for whenever that adapter lands.
CREATE TABLE sentinel2_ndbi_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES ingest_job_log (id) ON DELETE SET NULL,
  grid_id bigint REFERENCES grid (grid_id) ON DELETE CASCADE,
  ndbi_mean double precision NOT NULL,
  scene_id text NOT NULL,
  captured_at date NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

-- BPS kepadatan penduduk, manual import via spatial join to kelurahan
-- boundaries (Asumsi A4: manual/batch, not a live adapter).
CREATE TABLE bps_kepadatan_penduduk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelurahan_code text NOT NULL UNIQUE,
  kelurahan_name text NOT NULL,
  kepadatan_per_km2 double precision NOT NULL,
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  source_year integer NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bps_kepadatan_penduduk_boundary ON bps_kepadatan_penduduk USING GIST (boundary);
