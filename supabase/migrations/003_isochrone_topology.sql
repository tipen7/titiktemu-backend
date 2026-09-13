-- Fase 2 (Minggu 3): pgRouting-based network analysis for
-- GET /api/isochrone (walking distance from the OSM road network).
--
-- `source`/`target` are populated by pgr_createTopology(...), which the OSM
-- ingest job (runOsmIngestJob) re-runs after every ingest so the routing
-- graph stays in sync with `osm_road`. It also creates the
-- `osm_road_vertices_pgr` table on first run — there's nothing to do here
-- for that.
CREATE EXTENSION IF NOT EXISTS pgrouting;

ALTER TABLE osm_road ADD COLUMN source bigint;
ALTER TABLE osm_road ADD COLUMN target bigint;

-- Real-world edge length in meters, independent of geom's degree-based SRID
-- (4326) — used as pgr_drivingDistance's cost.
ALTER TABLE osm_road ADD COLUMN length_m double precision
  GENERATED ALWAYS AS (ST_Length(geom::geography)) STORED;

CREATE INDEX idx_osm_road_source ON osm_road (source);
CREATE INDEX idx_osm_road_target ON osm_road (target);
