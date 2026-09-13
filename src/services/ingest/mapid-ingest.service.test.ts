import { beforeEach, describe, expect, it, vi } from "vitest";

const getMapidAdapter = vi.fn();
const startIngestJob = vi.fn();
const completeIngestJob = vi.fn();
const failIngestJob = vi.fn();
const insertMapidStagingRecords = vi.fn();

vi.mock("../../adapters/mapid/index.js", () => ({ getMapidAdapter }));
vi.mock("../../repositories/ingest-job.repository.js", () => ({
  startIngestJob,
  completeIngestJob,
  failIngestJob,
}));
vi.mock("../../repositories/mapid-staging.repository.js", () => ({
  insertMapidStagingRecords,
}));

const { runMapidIngestJob } = await import("./mapid-ingest.service.js");

describe("runMapidIngestJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startIngestJob.mockResolvedValue("job-1");
  });

  it("ingests all three MAPID datasets and marks the job successful", async () => {
    getMapidAdapter.mockReturnValue({
      getStrukGo: vi.fn().mockResolvedValue([{ id: "struk-1" }]),
      getMenuGo: vi.fn().mockResolvedValue([{ id: "menu-1" }]),
      getPropertiGo: vi.fn().mockResolvedValue([{ id: "properti-1" }]),
    });
    insertMapidStagingRecords.mockResolvedValue(3);

    const result = await runMapidIngestJob();

    expect(result).toEqual({ jobId: "job-1", recordsIngested: 3 });
    expect(insertMapidStagingRecords).toHaveBeenCalledWith("job-1", {
      strukGo: [{ id: "struk-1" }],
      menuGo: [{ id: "menu-1" }],
      propertiGo: [{ id: "properti-1" }],
    });
    expect(completeIngestJob).toHaveBeenCalledWith("job-1", 3);
    expect(failIngestJob).not.toHaveBeenCalled();
  });

  it("marks the job failed and rethrows when the adapter errors", async () => {
    getMapidAdapter.mockReturnValue({
      getStrukGo: vi.fn().mockRejectedValue(new Error("MAPID unreachable")),
      getMenuGo: vi.fn().mockResolvedValue([]),
      getPropertiGo: vi.fn().mockResolvedValue([]),
    });

    await expect(runMapidIngestJob()).rejects.toThrow("MAPID unreachable");

    expect(failIngestJob).toHaveBeenCalledWith("job-1", "MAPID unreachable");
    expect(completeIngestJob).not.toHaveBeenCalled();
  });
});
