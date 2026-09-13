import type { PolicyNarrativePayload } from "../../validators/gemini.validators.js";
import type { GeminiAdapter } from "./gemini-adapter.interface.js";

export class MockGeminiAdapter implements GeminiAdapter {
  async generatePolicyNarrative(
    payload: PolicyNarrativePayload,
  ): Promise<string> {
    return `[mock narrative] Grid ${payload.gridId} is classified at risk code ${payload.riskCode}.`;
  }
}
