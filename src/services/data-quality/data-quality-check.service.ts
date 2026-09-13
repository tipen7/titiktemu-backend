import { query } from "../../db/index.js";
import {
  completeIngestJob,
  failIngestJob,
  startIngestJob,
} from "../../repositories/ingest-job.repository.js";

export interface DataQualityIssue {
  check: string;
  severity: "warning" | "error";
  count: number;
  sampleIds: string[];
}

export interface DataQualityReport {
  jobId: string;
  issues: DataQualityIssue[];
}

interface IdRow {
  id: string;
}

interface DataQualityCheckDefinition {
  name: string;
  severity: DataQualityIssue["severity"];
  sql: string;
}

const SAMPLE_LIMIT = 20;

// Hari 5 MUST deliverable: "validasi topologi & data quality check
// pipeline". Each check is a standalone query returning offending row ids;
// an empty result means that check passes. Add new checks here as the
// staging schema grows (BPS, more MAPID datasets, etc).
const CHECKS: DataQualityCheckDefinition[] = [
  {
    name: "grid_invalid_geometry",
    severity: "error",
    sql: "SELECT grid_id::text AS id FROM grid WHERE NOT ST_IsValid(geom)",
  },
  {
    name: "osm_road_invalid_geometry",
    severity: "error",
    sql: "SELECT osm_id::text AS id FROM osm_road WHERE NOT ST_IsValid(geom)",
  },
  {
    name: "osm_poi_invalid_geometry",
    severity: "error",
    sql: "SELECT osm_id::text AS id FROM osm_poi WHERE NOT ST_IsValid(geom)",
  },
  {
    name: "mapid_staging_missing_location",
    severity: "warning",
    sql: "SELECT id::text AS id FROM mapid_staging WHERE location IS NULL",
  },
  {
    name: "grid_missing_ndbi_coverage",
    severity: "warning",
    sql: `SELECT g.grid_id::text AS id FROM grid g
          WHERE NOT EXISTS (
            SELECT 1 FROM sentinel2_ndbi_staging s WHERE s.grid_id = g.grid_id
          )`,
  },
  {
    name: "ingest_job_stuck_running",
    severity: "error",
    sql: `SELECT id::text AS id FROM ingest_job_log
          WHERE status = 'running' AND started_at < now() - interval '1 hour'`,
  },
  {
    name: "ingest_job_failed_recent",
    severity: "warning",
    sql: `SELECT id::text AS id FROM ingest_job_log
          WHERE status = 'failed' AND started_at > now() - interval '24 hours'`,
  },
];

export async function runDataQualityCheck(): Promise<DataQualityReport> {
  const jobId = await startIngestJob("data_quality", "data-quality-check");

  try {
    const issues: DataQualityIssue[] = [];

    for (const check of CHECKS) {
      const rows = await query<IdRow>(check.sql);
      if (rows.length === 0) continue;

      issues.push({
        check: check.name,
        severity: check.severity,
        count: rows.length,
        sampleIds: rows.slice(0, SAMPLE_LIMIT).map((row) => row.id),
      });
    }

    await completeIngestJob(jobId, issues.length, { issues });
    return { jobId, issues };
  } catch (error) {
    await failIngestJob(
      jobId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
