import { query } from "../db/index.js";
import type { OsmPoi, OsmRoad } from "../validators/osm.validators.js";

export async function insertOsmRoads(
  jobId: string,
  roads: OsmRoad[],
): Promise<number> {
  await Promise.all(
    roads.map((road) =>
      query(
        `INSERT INTO osm_road (osm_id, job_id, road_type, name, geom)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromText($5), 4326))
         ON CONFLICT (osm_id) DO UPDATE
           SET road_type = EXCLUDED.road_type,
               name = EXCLUDED.name,
               geom = EXCLUDED.geom,
               job_id = EXCLUDED.job_id,
               ingested_at = now()`,
        [
          road.osmId,
          jobId,
          road.roadType,
          road.name ?? null,
          toLineStringWkt(road.geometry.coordinates),
        ],
      ),
    ),
  );
  return roads.length;
}

export async function insertOsmPois(
  jobId: string,
  pois: OsmPoi[],
): Promise<number> {
  await Promise.all(
    pois.map((poi) =>
      query(
        `INSERT INTO osm_poi (osm_id, job_id, poi_type, name, tags, geom)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326))
         ON CONFLICT (osm_id) DO UPDATE
           SET poi_type = EXCLUDED.poi_type,
               name = EXCLUDED.name,
               tags = EXCLUDED.tags,
               geom = EXCLUDED.geom,
               job_id = EXCLUDED.job_id,
               ingested_at = now()`,
        [
          poi.osmId,
          jobId,
          poi.poiType,
          poi.name ?? null,
          JSON.stringify(poi.tags),
          poi.location.lng,
          poi.location.lat,
        ],
      ),
    ),
  );
  return pois.length;
}

function toLineStringWkt(coordinates: [number, number][]): string {
  const points = coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
  return `LINESTRING(${points})`;
}

// Rebuilds the pgRouting graph (source/target columns + the
// osm_road_vertices_pgr table) from current osm_road geometries. Cheap
// enough to re-run in full after every ingest given this repo's data
// volume; tolerance is in degrees (~1m) since geom is EPSG:4326.
export async function rebuildRoadTopology(): Promise<void> {
  await query(
    "SELECT pgr_createTopology('osm_road', 0.00001, 'geom', 'osm_id')",
  );
}
