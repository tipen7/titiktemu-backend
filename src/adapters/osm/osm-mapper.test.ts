import { describe, expect, it } from "vitest";
import type { OverpassElement } from "./osm-mapper.js";
import {
  mapOverpassNodesToPois,
  mapOverpassWaysToRoads,
} from "./osm-mapper.js";

describe("mapOverpassWaysToRoads", () => {
  it("maps a tagged way with geometry into an OsmRoad", () => {
    const elements: OverpassElement[] = [
      {
        type: "way",
        id: 42,
        tags: { highway: "secondary", name: "Jl. Fatmawati Raya" },
        geometry: [
          { lat: -6.2896, lon: 106.7975 },
          { lat: -6.2871, lon: 106.7998 },
        ],
      },
    ];

    expect(mapOverpassWaysToRoads(elements)).toEqual([
      {
        osmId: 42,
        roadType: "secondary",
        name: "Jl. Fatmawati Raya",
        geometry: {
          type: "LineString",
          coordinates: [
            [106.7975, -6.2896],
            [106.7998, -6.2871],
          ],
        },
      },
    ]);
  });

  it("skips ways without geometry or nodes", () => {
    const elements: OverpassElement[] = [
      { type: "way", id: 1, tags: { highway: "residential" } },
      { type: "node", id: 2, lat: -6.2, lon: 106.8 },
    ];

    expect(mapOverpassWaysToRoads(elements)).toEqual([]);
  });
});

describe("mapOverpassNodesToPois", () => {
  it("derives poiType from the matched tag key", () => {
    const elements: OverpassElement[] = [
      {
        type: "node",
        id: 7,
        lat: -6.2,
        lon: 106.816666,
        tags: { amenity: "cafe", name: "Kopi Kenangan" },
      },
    ];

    expect(mapOverpassNodesToPois(elements)).toEqual([
      {
        osmId: 7,
        poiType: "amenity:cafe",
        name: "Kopi Kenangan",
        tags: { amenity: "cafe", name: "Kopi Kenangan" },
        location: { lat: -6.2, lng: 106.816666 },
      },
    ]);
  });

  it("skips nodes without tags or coordinates", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 8, lat: -6.2, lon: 106.8 },
      { type: "way", id: 9, tags: { amenity: "cafe" } },
    ];

    expect(mapOverpassNodesToPois(elements)).toEqual([]);
  });
});
