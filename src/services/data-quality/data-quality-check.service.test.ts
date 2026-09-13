import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();
const startIngestJob = vi.fn();
const completeIngestJob = vi.fn();
const failIngestJob = vi.fn();

vi.mock("../../db/index.js", () => ({ query }));
vi.mock("../../repositories/ingest-job.repository.js", () => ({
  startIngestJob,
  completeIngestJob,
  failIngestJob,
}));

const { runDataQualityCheck } = await import("./data-quality-check.service.js");

describe("runDataQualityCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startIngestJob.mockResolvedValue("job-1");
  });

  it("reports no issues and completes the job when every check is clean", async () => {
    query.mockResolvedValue([]);

    const report = await runDataQualityCheck();

    expect(report).toEqual({ jobId: "job-1", issues: [] });
    expect(completeIngestJob).toHaveBeenCalledWith("job-1", 0, { issues: [] });
    expect(failIngestJob).not.toHaveBeenCalled();
  });

  it("collects offending row ids per failing check", async () => {
    query.mockImplementation(async (sql: string) => {
      const isGridGeometryCheck = sql.includes(
        "FROM grid WHERE NOT ST_IsValid",
      );
      return isGridGeometryCheck ? [{ id: "1" }, { id: "2" }] : [];
    });

    const report = await runDataQualityCheck();

    expect(report.jobId).toBe("job-1");
    expect(report.issues).toEqual([
      {
        check: "grid_invalid_geometry",
        severity: "error",
        count: 2,
        sampleIds: ["1", "2"],
      },
    ]);
    expect(completeIngestJob).toHaveBeenCalledWith("job-1", 1, {
      issues: report.issues,
    });
  });

  it("marks the job failed and rethrows when a check query errors", async () => {
    query.mockRejectedValue(new Error("connection lost"));

    await expect(runDataQualityCheck()).rejects.toThrow("connection lost");

    expect(failIngestJob).toHaveBeenCalledWith("job-1", "connection lost");
    expect(completeIngestJob).not.toHaveBeenCalled();
  });
});
