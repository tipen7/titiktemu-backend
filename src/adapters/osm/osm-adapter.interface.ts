import type {
  OsmBoundingBox,
  OsmPoi,
  OsmRoad,
} from "../../validators/osm.validators.js";

export interface OsmAdapter {
  getRoadNetwork(bbox: OsmBoundingBox): Promise<OsmRoad[]>;
  getPois(bbox: OsmBoundingBox): Promise<OsmPoi[]>;
}
