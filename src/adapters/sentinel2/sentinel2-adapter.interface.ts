import type {
  Sentinel2GridQuery,
  Sentinel2NdbiResult,
} from "../../validators/sentinel2.validators.js";

export interface Sentinel2Adapter {
  getNdbiForGrids(
    queries: Sentinel2GridQuery[],
  ): Promise<Sentinel2NdbiResult[]>;
}
