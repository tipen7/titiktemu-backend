import type { PolicyNarrativePayload } from "../../validators/gemini.validators.js";
import type { GeminiAdapter } from "./gemini-adapter.interface.js";

// test.md's risk mitigation: "set timeout ketat (mis. 5s) pada call Gemini".
const REQUEST_TIMEOUT_MS = 5_000;

interface GeminiGenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class RealGeminiAdapter implements GeminiAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generatePolicyNarrative(
    payload: PolicyNarrativePayload,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildPrompt(payload) }] }],
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Gemini API request failed with status ${response.status}`,
        );
      }

      const body = (await response.json()) as GeminiGenerateContentResponse;
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini API returned no narrative text");
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Asumsi A5: Gemini narrates a payload that's already been fully computed —
// it must not be asked to recalculate any number itself.
function buildPrompt(payload: PolicyNarrativePayload): string {
  const metrics = Object.entries(payload.keyMetrics)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [
    "Anda adalah asisten kebijakan tata ruang untuk pemerintah daerah.",
    `Grid ${payload.gridId} diklasifikasikan dengan kode risiko ${payload.riskCode} (0=aman, 1=waspada, 2=kritis).`,
    "Metrik pendukung:",
    metrics,
    "Tulis narasi rekomendasi kebijakan singkat (maksimal 3 kalimat) dalam Bahasa Indonesia, berdasarkan data di atas saja. Jangan menghitung ulang angka.",
  ].join("\n");
}
