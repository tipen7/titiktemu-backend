import { query } from "../db/index.js";
import type { OsmBoundingBox } from "../validators/osm.validators.js";

export interface GridCell {
  gridId: number;
  bbox: OsmBoundingBox;
}

interface GridBboxRow {
  grid_id: number;
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
}

export async function listGridCells(): Promise<GridCell[]> {
  const rows = await query<GridBboxRow>(
    `SELECT grid_id,
            ST_XMin(ST_Transform(geom, 4326)) AS min_lng,
            ST_YMin(ST_Transform(geom, 4326)) AS min_lat,
            ST_XMax(ST_Transform(geom, 4326)) AS max_lng,
            ST_YMax(ST_Transform(geom, 4326)) AS max_lat
     FROM grid`,
  );

  return rows.map((row) => ({
    gridId: row.grid_id,
    bbox: {
      minLng: row.min_lng,
      minLat: row.min_lat,
      maxLng: row.max_lng,
      maxLat: row.max_lat,
    },
  }));
}
