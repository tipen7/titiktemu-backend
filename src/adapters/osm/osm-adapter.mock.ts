import {
  type OsmPoi,
  type OsmRoad,
  osmPoiSchema,
  osmRoadSchema,
} from "../../validators/osm.validators.js";
import type { OsmAdapter } from "./osm-adapter.interface.js";

const roadFixtures: OsmRoad[] = [
  osmRoadSchema.parse({
    osmId: 100001,
    roadType: "secondary",
    name: "Jl. Fatmawati Raya",
    geometry: {
      type: "LineString",
      coordinates: [
        [106.7975, -6.2896],
        [106.7998, -6.2871],
      ],
    },
  }),
];

const poiFixtures: OsmPoi[] = [
  osmPoiSchema.parse({
    osmId: 200001,
    poiType: "amenity:cafe",
    name: "Kopi Kenangan",
    tags: { amenity: "cafe", name: "Kopi Kenangan" },
    location: { lat: -6.2, lng: 106.816666 },
  }),
];

export class MockOsmAdapter implements OsmAdapter {
  async getRoadNetwork(): Promise<OsmRoad[]> {
    return roadFixtures;
  }

  async getPois(): Promise<OsmPoi[]> {
    return poiFixtures;
  }
}
