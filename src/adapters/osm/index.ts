import type { OsmAdapter } from "./osm-adapter.interface.js";
import { OverpassOsmAdapter } from "./osm-adapter.js";

export type { OsmAdapter } from "./osm-adapter.interface.js";

export function getOsmAdapter(): OsmAdapter {
  return new OverpassOsmAdapter();
}
