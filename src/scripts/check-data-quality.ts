import { runDataQualityCheck } from "../services/data-quality/data-quality-check.service.js";

runDataQualityCheck()
  .then((report) => {
    if (report.issues.length === 0) {
      console.log(
        `Data quality check complete: job ${report.jobId}, no issues found`,
      );
      process.exit(0);
    }

    console.log(
      `Data quality check complete: job ${report.jobId}, ${report.issues.length} issue type(s) found`,
    );
    for (const issue of report.issues) {
      console.log(
        `  [${issue.severity}] ${issue.check}: ${issue.count} row(s) — sample: ${issue.sampleIds.join(", ")}`,
      );
    }

    process.exit(
      report.issues.some((issue) => issue.severity === "error") ? 1 : 0,
    );
  })
  .catch((error) => {
    console.error("Data quality check failed:", error);
    process.exit(1);
  });
