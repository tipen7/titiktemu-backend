import { afterEach, describe, expect, it, vi } from "vitest";
import type { PolicyNarrativePayload } from "../../validators/gemini.validators.js";
import { RealGeminiAdapter } from "./gemini-adapter.js";

const payload: PolicyNarrativePayload = {
  gridId: 1,
  riskCode: 1,
  keyMetrics: { ndbiMean: 0.12 },
};

describe("RealGeminiAdapter", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the narrative text from a successful response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Contoh narasi." }] } }],
      }),
    }) as unknown as typeof fetch;

    const adapter = new RealGeminiAdapter("test-key", "gemini-test");
    await expect(adapter.generatePolicyNarrative(payload)).resolves.toBe(
      "Contoh narasi.",
    );
  });

  it("throws when the API responds with a non-OK status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const adapter = new RealGeminiAdapter("test-key", "gemini-test");
    await expect(adapter.generatePolicyNarrative(payload)).rejects.toThrow(
      "Gemini API request failed with status 500",
    );
  });

  it("throws when the response has no narrative text", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    }) as unknown as typeof fetch;

    const adapter = new RealGeminiAdapter("test-key", "gemini-test");
    await expect(adapter.generatePolicyNarrative(payload)).rejects.toThrow(
      "Gemini API returned no narrative text",
    );
  });

  it("aborts the request after the 5s timeout", async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url, init) => {
      return new Promise((_resolve, reject) => {
        (init as RequestInit)?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }) as unknown as typeof fetch;

    const adapter = new RealGeminiAdapter("test-key", "gemini-test");
    const result = adapter.generatePolicyNarrative(payload);
    const assertion = expect(result).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });
});
