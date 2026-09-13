import { appConfig } from "../../config/index.js";
import type { GeminiAdapter } from "./gemini-adapter.interface.js";
import { RealGeminiAdapter } from "./gemini-adapter.js";
import { MockGeminiAdapter } from "./gemini-adapter.mock.js";

export type { GeminiAdapter } from "./gemini-adapter.interface.js";

export function getGeminiAdapter(): GeminiAdapter {
  return appConfig.geminiApiKey
    ? new RealGeminiAdapter(appConfig.geminiApiKey, appConfig.geminiModel)
    : new MockGeminiAdapter();
}
