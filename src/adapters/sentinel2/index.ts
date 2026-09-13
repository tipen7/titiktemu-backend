import type { Sentinel2Adapter } from "./sentinel2-adapter.interface.js";
import { MockSentinel2Adapter } from "./sentinel2-adapter.mock.js";

export type { Sentinel2Adapter } from "./sentinel2-adapter.interface.js";

export function getSentinel2Adapter(): Sentinel2Adapter {
  // Real NDBI computation needs a Python geospatial stack (rasterio/eodag,
  // per the risk register) that doesn't exist in this repo yet.
  return new MockSentinel2Adapter();
}
