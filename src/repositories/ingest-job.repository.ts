import { randomUUID } from "node:crypto";
import { query } from "../db/index.js";

// Audit trail for batch ingest jobs (MAPID, OSM, Sentinel-2, BPS). Every job
// run gets one row here, updated in place as it progresses.
export async function startIngestJob(
  source: string,
  jobName: string,
): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO ingest_job_log (id, source, job_name, status)
     VALUES ($1, $2, $3, 'running')`,
    [id, source, jobName],
  );
  return id;
}

export async function completeIngestJob(
  jobId: string,
  recordsIngested: number,
  metadata?: unknown,
): Promise<void> {
  await query(
    `UPDATE ingest_job_log
     SET status = 'success', records_ingested = $2, metadata = $3, finished_at = now()
     WHERE id = $1`,
    [jobId, recordsIngested, JSON.stringify(metadata ?? {})],
  );
}

export async function failIngestJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  await query(
    `UPDATE ingest_job_log
     SET status = 'failed', error_message = $2, finished_at = now()
     WHERE id = $1`,
    [jobId, errorMessage],
  );
}
