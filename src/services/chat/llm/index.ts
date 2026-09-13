// Provider dispatcher -- picks the LLM backend from appConfig.llmProvider
// (env var LLM_PROVIDER) so the chatbot isn't locked into one vendor. All
// three providers share the same prompt (./prompt.ts) and result shape
// (./types.ts); only the request/response wire format differs.

import { appConfig } from "../../../config/index.js";
import { callClaude } from "./claude.js";
import { callGemini } from "./gemini.js";
import { callOpenAi } from "./openai.js";
import type { ChatRole, ChatTurn, LlmChatResult } from "./types.js";

export * from "./types.js";

export async function callChat(
  message: string,
  role: ChatRole,
  context: string,
  history: ChatTurn[],
): Promise<LlmChatResult> {
  switch (appConfig.llmProvider) {
    case "openai":
      return callOpenAi(message, role, context, history);
    case "claude":
      return callClaude(message, role, context, history);
    default:
      return callGemini(message, role, context, history);
  }
}
