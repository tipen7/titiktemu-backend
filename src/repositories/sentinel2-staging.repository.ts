import { query } from "../db/index.js";
import type { Sentinel2NdbiResult } from "../validators/sentinel2.validators.js";

export async function insertSentinel2NdbiResults(
  jobId: string,
  results: Sentinel2NdbiResult[],
): Promise<number> {
  await Promise.all(
    results.map((result) =>
      query(
        `INSERT INTO sentinel2_ndbi_staging (job_id, grid_id, ndbi_mean, scene_id, captured_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          jobId,
          result.gridId,
          result.ndbiMean,
          result.sceneId,
          result.capturedAt,
        ],
      ),
    ),
  );
  return results.length;
}
