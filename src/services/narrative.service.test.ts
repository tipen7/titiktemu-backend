import { beforeEach, describe, expect, it, vi } from "vitest";

const getGeminiAdapter = vi.fn();
vi.mock("../adapters/gemini/index.js", () => ({ getGeminiAdapter }));

const { generateNarrative } = await import("./narrative.service.js");

const payload = {
  gridId: 1,
  riskCode: 1 as const,
  keyMetrics: { ndbiMean: 0.12 },
};

describe("generateNarrative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the adapter's narrative when it succeeds", async () => {
    getGeminiAdapter.mockReturnValue({
      generatePolicyNarrative: vi.fn().mockResolvedValue("Contoh narasi."),
    });

    await expect(generateNarrative(payload)).resolves.toEqual({
      narrative: "Contoh narasi.",
      generatedByLlm: true,
    });
  });

  it("falls back to a narrative-less result instead of throwing when the adapter fails", async () => {
    getGeminiAdapter.mockReturnValue({
      generatePolicyNarrative: vi
        .fn()
        .mockRejectedValue(new Error("Gemini API request failed")),
    });

    await expect(generateNarrative(payload)).resolves.toEqual({
      narrative: null,
      generatedByLlm: false,
    });
  });
});
