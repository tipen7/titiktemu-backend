import { STUDY_CORRIDOR_BBOX } from "../config/corridor.js";
import { runOsmIngestJob } from "../services/ingest/osm-ingest.service.js";

runOsmIngestJob(STUDY_CORRIDOR_BBOX)
  .then((result) => {
    console.log(
      `OSM ingest complete: job ${result.jobId}, ${result.roadsIngested} roads, ${result.poisIngested} POIs`,
    );
    process.exit(0);
  })
  .catch((error) => {
    console.error("OSM ingest failed:", error);
    process.exit(1);
  });
