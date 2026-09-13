import { query } from "../db/index.js";

export interface IsochroneEdge {
  osmId: number;
  roadType: string;
  name: string | null;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface IsochroneComputation {
  reachedNodeCount: number;
  hull: { type: "Polygon"; coordinates: number[][][] } | null;
  edges: IsochroneEdge[];
}

// Road types a pedestrian isochrone shouldn't route through. Inlined as SQL
// literals (not bind params) because this string is itself the query
// pgr_drivingDistance executes internally — it can't reference the outer
// query's placeholders.
const NON_WALKABLE_ROAD_TYPES = [
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
];

function buildEdgesSql(): string {
  const excluded = NON_WALKABLE_ROAD_TYPES.map((type) => `'${type}'`).join(
    ", ",
  );
  return `SELECT osm_id AS id, source, target, length_m AS cost FROM osm_road WHERE road_type NOT IN (${excluded})`;
}

interface NearestVertexRow {
  id: string;
}

interface ReachedNodeRow {
  node: string;
}

interface HullRow {
  hull: string | null;
}

interface EdgeRow {
  osm_id: number;
  road_type: string;
  name: string | null;
  geojson: string;
}

// Returns null when there's no road network near the given point (e.g.
// OSM hasn't been ingested for that area yet, or pgr_createTopology hasn't
// run — see rebuildRoadTopology in osm.repository.ts).
export async function computeIsochrone(
  lat: number,
  lng: number,
  maxDistanceMeters: number,
): Promise<IsochroneComputation | null> {
  const nearest = await query<NearestVertexRow>(
    `SELECT id::text AS id
     FROM osm_road_vertices_pgr
     ORDER BY the_geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
     LIMIT 1`,
    [lng, lat],
  );
  const startVertexId = nearest[0]?.id;
  if (startVertexId === undefined) return null;

  const reached = await query<ReachedNodeRow>(
    "SELECT node::text AS node FROM pgr_drivingDistance($1, $2::bigint, $3, false)",
    [buildEdgesSql(), startVertexId, maxDistanceMeters],
  );
  if (reached.length === 0) {
    return { reachedNodeCount: 0, hull: null, edges: [] };
  }

  const nodeIds = reached.map((row) => row.node);

  const hullRows = await query<HullRow>(
    `SELECT ST_AsGeoJSON(ST_ConcaveHull(ST_Collect(the_geom), 0.5)) AS hull
     FROM osm_road_vertices_pgr
     WHERE id = ANY($1::bigint[])`,
    [nodeIds],
  );
  const hullGeojson = hullRows[0]?.hull;
  const hull = hullGeojson
    ? (JSON.parse(hullGeojson) as IsochroneComputation["hull"])
    : null;

  const edgeRows = await query<EdgeRow>(
    `SELECT osm_id, road_type, name, ST_AsGeoJSON(geom) AS geojson
     FROM osm_road
     WHERE source = ANY($1::bigint[]) AND target = ANY($1::bigint[])`,
    [nodeIds],
  );

  return {
    reachedNodeCount: nodeIds.length,
    hull,
    edges: edgeRows.map((row) => ({
      osmId: row.osm_id,
      roadType: row.road_type,
      name: row.name,
      geometry: JSON.parse(row.geojson) as IsochroneEdge["geometry"],
    })),
  };
}
