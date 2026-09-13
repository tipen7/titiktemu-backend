import { beforeEach, describe, expect, it, vi } from "vitest";

const getSentinel2Adapter = vi.fn();
const listGridCells = vi.fn();
const startIngestJob = vi.fn();
const completeIngestJob = vi.fn();
const failIngestJob = vi.fn();
const insertSentinel2NdbiResults = vi.fn();

vi.mock("../../adapters/sentinel2/index.js", () => ({ getSentinel2Adapter }));
vi.mock("../../repositories/grid.repository.js", () => ({ listGridCells }));
vi.mock("../../repositories/ingest-job.repository.js", () => ({
  startIngestJob,
  completeIngestJob,
  failIngestJob,
}));
vi.mock("../../repositories/sentinel2-staging.repository.js", () => ({
  insertSentinel2NdbiResults,
}));

const { runSentinel2IngestJob } = await import("./sentinel2-ingest.service.js");

describe("runSentinel2IngestJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startIngestJob.mockResolvedValue("job-1");
  });

  it("queries NDBI for every known grid cell and marks the job successful", async () => {
    const bbox = { minLng: 106.8, minLat: -6.2, maxLng: 106.81, maxLat: -6.19 };
    listGridCells.mockResolvedValue([{ gridId: 1, bbox }]);
    const getNdbiForGrids = vi.fn().mockResolvedValue([
      {
        gridId: 1,
        ndbiMean: 0.12,
        sceneId: "S2A_MSIL2A_MOCK",
        capturedAt: "2026-08-15",
      },
    ]);
    getSentinel2Adapter.mockReturnValue({ getNdbiForGrids });
    insertSentinel2NdbiResults.mockResolvedValue(1);

    const result = await runSentinel2IngestJob();

    expect(getNdbiForGrids).toHaveBeenCalledWith([{ gridId: 1, bbox }]);
    expect(result).toEqual({ jobId: "job-1", recordsIngested: 1 });
    expect(completeIngestJob).toHaveBeenCalledWith("job-1", 1);
    expect(failIngestJob).not.toHaveBeenCalled();
  });

  it("marks the job failed and rethrows when the adapter errors", async () => {
    listGridCells.mockResolvedValue([]);
    getSentinel2Adapter.mockReturnValue({
      getNdbiForGrids: vi
        .fn()
        .mockRejectedValue(new Error("adapter unavailable")),
    });

    await expect(runSentinel2IngestJob()).rejects.toThrow(
      "adapter unavailable",
    );

    expect(failIngestJob).toHaveBeenCalledWith("job-1", "adapter unavailable");
    expect(completeIngestJob).not.toHaveBeenCalled();
  });
});
