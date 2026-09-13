import supertest from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked at the service seam so this test doesn't depend on whether
// GEMINI_API_KEY happens to be set in the local environment.
const generateNarrative = vi.fn();
vi.mock("../services/narrative.service.js", () => ({ generateNarrative }));

const { app } = await import("../app.js");

describe("POST /api/narrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the generated narrative for a valid payload", async () => {
    generateNarrative.mockResolvedValue({
      narrative: "Contoh narasi.",
      generatedByLlm: true,
    });

    const response = await supertest(app)
      .post("/api/narrative")
      .send({ gridId: 1, riskCode: 1, keyMetrics: { ndbiMean: 0.12 } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      narrative: "Contoh narasi.",
      generatedByLlm: true,
    });
  });

  it("rejects an invalid payload", async () => {
    const response = await supertest(app)
      .post("/api/narrative")
      .send({ gridId: 1 });

    expect(response.status).toBe(400);
    expect(generateNarrative).not.toHaveBeenCalled();
  });
});
