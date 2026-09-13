import { getGeminiAdapter } from "../adapters/gemini/index.js";
import type { PolicyNarrativePayload } from "../validators/gemini.validators.js";

export interface NarrativeResult {
  narrative: string | null;
  generatedByLlm: boolean;
}

// Mitigation from test.md's risk register: if Gemini fails or times out
// (RealGeminiAdapter enforces a 5s timeout), fall back to the raw
// structured data — no narrative — rather than a hard error.
export async function generateNarrative(
  payload: PolicyNarrativePayload,
): Promise<NarrativeResult> {
  try {
    const narrative = await getGeminiAdapter().generatePolicyNarrative(payload);
    return { narrative, generatedByLlm: true };
  } catch {
    return { narrative: null, generatedByLlm: false };
  }
}
