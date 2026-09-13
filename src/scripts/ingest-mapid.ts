import { runMapidIngestJob } from "../services/ingest/mapid-ingest.service.js";

runMapidIngestJob()
  .then((result) => {
    console.log(
      `MAPID ingest complete: job ${result.jobId}, ${result.recordsIngested} records`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("MAPID ingest failed:", error);
    process.exit(1);
  });
