import type {
  OsmBoundingBox,
  OsmPoi,
  OsmRoad,
} from "../../validators/osm.validators.js";
import type { OsmAdapter } from "./osm-adapter.interface.js";
import type { OverpassElement } from "./osm-mapper.js";
import {
  mapOverpassNodesToPois,
  mapOverpassWaysToRoads,
  POI_TAG_KEYS,
} from "./osm-mapper.js";

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const REQUEST_TIMEOUT_MS = 60_000;

interface OverpassResponse {
  elements: OverpassElement[];
}

// Public, unauthenticated API — unlike MAPID there's no contract to
// confirm, so this talks to Overpass for real rather than going behind a
// mock-first factory.
export class OverpassOsmAdapter implements OsmAdapter {
  async getRoadNetwork(bbox: OsmBoundingBox): Promise<OsmRoad[]> {
    const query = `[out:json][timeout:60];(way["highway"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`;
    const response = await runOverpassQuery(query);
    return mapOverpassWaysToRoads(response.elements);
  }

  async getPois(bbox: OsmBoundingBox): Promise<OsmPoi[]> {
    const filters = POI_TAG_KEYS.map(
      (key) =>
        `node["${key}"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});`,
    ).join("");
    const query = `[out:json][timeout:60];(${filters});out;`;
    const response = await runOverpassQuery(query);
    return mapOverpassNodesToPois(response.elements);
  }
}

async function runOverpassQuery(overpassQl: string): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpassQl)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API request failed with status ${response.status}`,
      );
    }

    return (await response.json()) as OverpassResponse;
  } finally {
    clearTimeout(timeout);
  }
}
