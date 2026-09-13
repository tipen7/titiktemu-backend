import type { OsmBoundingBox } from "../validators/osm.validators.js";

// Rough bounding box around the MRT Lebak Bulus–Bundaran HI corridor plus a
// loose buffer (per test.md's study-area assumption). This is a stand-in for
// the actual buffered corridor geometry the "Import & grid-ing data koridor
// studi" task is expected to produce — replace it once that exists.
export const STUDY_CORRIDOR_BBOX: OsmBoundingBox = {
  minLng: 106.774,
  minLat: -6.295,
  maxLng: 106.824,
  maxLat: -6.193,
};
