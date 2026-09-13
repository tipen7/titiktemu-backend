import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked at the service seam (not just the adapter) so this test is immune
// to ML_SCORING_SERVICE_URL happening to be set in the local environment —
// that would otherwise make getScoringAdapter() return HttpScoringAdapter
// and try a real network call.
const classifyRisk = vi.fn();
const matchTenant = vi.fn();
vi.mock("../services/scoring.service.js", () => ({
  classifyRisk,
  matchTenant,
}));

const { app } = await import("../app.js");

describe("POST /api/score/risk-classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the service result for a valid request", async () => {
    classifyRisk.mockResolvedValue({ gridId: 1, riskCode: 0, confidence: 0.5 });

    const response = await supertest(app)
      .post("/api/score/risk-classification")
      .send({
        gridId: 1,
        features: {
          poiCount: 12,
          distExitTolM: 150,
          distStationM: 400,
          ndbiMean: 0.05,
          kepadatanPenduduk: 8000,
          rentSurgeReported: false,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ gridId: 1, riskCode: 0, confidence: 0.5 });
  });

  it("rejects a request missing required fields", async () => {
    const response = await supertest(app)
      .post("/api/score/risk-classification")
      .send({ gridId: 1 });

    expect(response.status).toBe(400);
    expect(classifyRisk).not.toHaveBeenCalled();
  });
});

describe("POST /api/score/tenant-matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the service result for a valid request", async () => {
    matchTenant.mockResolvedValue({
      gridId: 1,
      businessCategory: "food_and_beverage",
      matchScore: 65,
    });

    const response = await supertest(app)
      .post("/api/score/tenant-matching")
      .send({
        gridId: 1,
        businessCategory: "food_and_beverage",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      gridId: 1,
      businessCategory: "food_and_beverage",
      matchScore: 65,
    });
  });

  it("rejects a request missing required fields", async () => {
    const response = await supertest(app)
      .post("/api/score/tenant-matching")
      .send({});

    expect(response.status).toBe(400);
    expect(matchTenant).not.toHaveBeenCalled();
  });
});
