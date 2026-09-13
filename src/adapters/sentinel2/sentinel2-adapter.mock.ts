import {
  type Sentinel2GridQuery,
  type Sentinel2NdbiResult,
  sentinel2NdbiResultSchema,
} from "../../validators/sentinel2.validators.js";
import type { Sentinel2Adapter } from "./sentinel2-adapter.interface.js";

export class MockSentinel2Adapter implements Sentinel2Adapter {
  async getNdbiForGrids(
    queries: Sentinel2GridQuery[],
  ): Promise<Sentinel2NdbiResult[]> {
    return queries.map((gridQuery) =>
      sentinel2NdbiResultSchema.parse({
        gridId: gridQuery.gridId,
        ndbiMean: 0.12,
        sceneId: "S2A_MSIL2A_MOCK",
        capturedAt: "2026-08-15",
      }),
    );
  }
}
