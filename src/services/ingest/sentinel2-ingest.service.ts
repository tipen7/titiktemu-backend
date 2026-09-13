import { getSentinel2Adapter } from "../../adapters/sentinel2/index.js";
import { listGridCells } from "../../repositories/grid.repository.js";
import {
  completeIngestJob,
  failIngestJob,
  startIngestJob,
} from "../../repositories/ingest-job.repository.js";
import { insertSentinel2NdbiResults } from "../../repositories/sentinel2-staging.repository.js";

export interface Sentinel2IngestResult {
  jobId: string;
  recordsIngested: number;
}

// Fallback path from test.md's risk mitigation ("gunakan data NDBI
// sample/precomputed untuk MVP demo"): getSentinel2Adapter() currently
// returns MockSentinel2Adapter, which supplies a placeholder ndbi_mean per
// grid cell instead of a real Sentinel-2 computation. Swap the adapter
// factory once a real one (Python geo stack) exists — this job doesn't need
// to change.
export async function runSentinel2IngestJob(): Promise<Sentinel2IngestResult> {
  const adapter = getSentinel2Adapter();
  const jobId = await startIngestJob("sentinel2", "sentinel2-ndbi-sample");

  try {
    const cells = await listGridCells();
    const results = await adapter.getNdbiForGrids(
      cells.map((cell) => ({ gridId: cell.gridId, bbox: cell.bbox })),
    );

    const recordsIngested = await insertSentinel2NdbiResults(jobId, results);

    await completeIngestJob(jobId, recordsIngested);
    return { jobId, recordsIngested };
  } catch (error) {
    await failIngestJob(
      jobId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
