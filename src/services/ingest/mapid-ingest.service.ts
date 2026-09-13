import { getMapidAdapter } from "../../adapters/mapid/index.js";
import {
  completeIngestJob,
  failIngestJob,
  startIngestJob,
} from "../../repositories/ingest-job.repository.js";
import { insertMapidStagingRecords } from "../../repositories/mapid-staging.repository.js";
import type { MapidLocationQuery } from "../../validators/mapid.validators.js";

export interface MapidIngestResult {
  jobId: string;
  recordsIngested: number;
}

// Pulls Struk Go / Menu Go / Properti Go from whatever adapter
// getMapidAdapter() currently returns (MockMapidAdapter until Asumsi A3 is
// resolved) and lands the results in `mapid_staging`, with an audit row per
// run. "Activity" data from the sprint doc isn't modeled here yet — the
// existing MapidAdapter interface only covers these three endpoints.
export async function runMapidIngestJob(
  locationQuery: MapidLocationQuery = {},
): Promise<MapidIngestResult> {
  const adapter = getMapidAdapter();
  const jobId = await startIngestJob("mapid", "mapid-struk-menu-properti-go");

  try {
    const [strukGo, menuGo, propertiGo] = await Promise.all([
      adapter.getStrukGo(locationQuery),
      adapter.getMenuGo(locationQuery),
      adapter.getPropertiGo(locationQuery),
    ]);

    const recordsIngested = await insertMapidStagingRecords(jobId, {
      strukGo,
      menuGo,
      propertiGo,
    });

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
