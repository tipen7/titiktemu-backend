import { getOsmAdapter } from "../../adapters/osm/index.js";
import {
  completeIngestJob,
  failIngestJob,
  startIngestJob,
} from "../../repositories/ingest-job.repository.js";
import {
  insertOsmPois,
  insertOsmRoads,
  rebuildRoadTopology,
} from "../../repositories/osm.repository.js";
import type { OsmBoundingBox } from "../../validators/osm.validators.js";

export interface OsmIngestResult {
  jobId: string;
  roadsIngested: number;
  poisIngested: number;
}

export async function runOsmIngestJob(
  bbox: OsmBoundingBox,
): Promise<OsmIngestResult> {
  const adapter = getOsmAdapter();
  const jobId = await startIngestJob("osm", "osm-road-network-and-poi");

  try {
    const [roads, pois] = await Promise.all([
      adapter.getRoadNetwork(bbox),
      adapter.getPois(bbox),
    ]);

    const roadsIngested = await insertOsmRoads(jobId, roads);
    const poisIngested = await insertOsmPois(jobId, pois);
    // Keep the /api/isochrone routing graph in sync with the roads just
    // written.
    await rebuildRoadTopology();

    await completeIngestJob(jobId, roadsIngested + poisIngested);
    return { jobId, roadsIngested, poisIngested };
  } catch (error) {
    await failIngestJob(
      jobId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
