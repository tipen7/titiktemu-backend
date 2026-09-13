import type { PolicyNarrativePayload } from "../../validators/gemini.validators.js";

export interface GeminiAdapter {
  generatePolicyNarrative(payload: PolicyNarrativePayload): Promise<string>;
}
