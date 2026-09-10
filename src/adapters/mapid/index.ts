import type { MapidAdapter } from "./mapid-adapter.interface.js";
import { MockMapidAdapter } from "./mapid-adapter.mock.js";

export type { MapidAdapter } from "./mapid-adapter.interface.js";

export function getMapidAdapter(): MapidAdapter {
  // Fase 1: branch on env (e.g. MAPID_ADAPTER_MODE) once the real MAPID
  // contract is confirmed (Asumsi A3) and a RealMapidAdapter exists.
  return new MockMapidAdapter();
}
