import { runSentinel2IngestJob } from "../services/ingest/sentinel2-ingest.service.js";

runSentinel2IngestJob()
  .then((result) => {
    console.log(
      `Sentinel-2 NDBI ingest complete: job ${result.jobId}, ${result.recordsIngested} records`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("Sentinel-2 NDBI ingest failed:", error);
    process.exit(1);
  });
