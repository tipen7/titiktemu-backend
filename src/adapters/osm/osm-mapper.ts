import type { OsmPoi, OsmRoad } from "../../validators/osm.validators.js";
import {
  osmPoiSchema,
  osmRoadSchema,
} from "../../validators/osm.validators.js";

// Tag keys queried for POIs; also used to derive a `poiType` like
// "amenity:cafe" from whichever tag matched.
export const POI_TAG_KEYS = ["amenity", "shop"] as const;

export interface OverpassElement {
  type: "node" | "way";
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
}

export function mapOverpassWaysToRoads(elements: OverpassElement[]): OsmRoad[] {
  return elements
    .filter(
      (element) =>
        element.type === "way" &&
        element.geometry &&
        element.geometry.length >= 2,
    )
    .map((element) =>
      osmRoadSchema.parse({
        osmId: element.id,
        roadType: element.tags?.highway ?? "unknown",
        name: element.tags?.name,
        geometry: {
          type: "LineString",
          coordinates: (element.geometry ?? []).map(
            (point) => [point.lon, point.lat] as [number, number],
          ),
        },
      }),
    );
}

export function mapOverpassNodesToPois(elements: OverpassElement[]): OsmPoi[] {
  return elements
    .filter(
      (element): element is OverpassElement & { lat: number; lon: number } =>
        element.type === "node" &&
        Boolean(element.tags) &&
        typeof element.lat === "number" &&
        typeof element.lon === "number",
    )
    .map((element) => {
      const tags = element.tags ?? {};
      const matchedKey = POI_TAG_KEYS.find((key) => tags[key]);
      const poiType = matchedKey
        ? `${matchedKey}:${tags[matchedKey]}`
        : "unknown";

      return osmPoiSchema.parse({
        osmId: element.id,
        poiType,
        name: tags.name,
        tags,
        location: { lat: element.lat, lng: element.lon },
      });
    });
}
