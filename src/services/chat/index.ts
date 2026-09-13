// Orchestrates the AI Chatbot: scope-guard -> retrieval -> LLM call ->
// LLM-level scope re-check. See DESIGN.md's chatbot requirement (Asisten
// AI TitikTemu, both Operator and UMKM user, scoped to this site only).

import { checkScope, REFUSAL_MESSAGES } from "./scope-guard.js";
import { buildContext, formatContext } from "./retrieval.js";
import { callGeminiChat, GeminiQuotaExceededError, type ChatRole, type ChatTurn } from "./gemini-chat.js";

export type { ChatRole, ChatTurn } from "./gemini-chat.js";

export interface ChatResponse {
  answer: string;
  highlight_grid_ids: string[];
  in_scope: boolean;
}

export async function getChatResponse(
  message: string,
  role: ChatRole,
  history: ChatTurn[],
): Promise<ChatResponse> {
  const scopeCheck = checkScope(message);
  if (!scopeCheck.allowed) {
    return { answer: REFUSAL_MESSAGES[scopeCheck.reason], highlight_grid_ids: [], in_scope: false };
  }

  const context = await buildContext(message);
  const formattedContext = formatContext(context);

  let result: Awaited<ReturnType<typeof callGeminiChat>>;
  try {
    result = await callGeminiChat(message, role, formattedContext, history);
  } catch (error) {
    if (error instanceof GeminiQuotaExceededError) {
      return {
        answer: "Asisten AI sedang tidak tersedia (kuota API tercapai). Silakan coba lagi nanti.",
        highlight_grid_ids: [],
        in_scope: true,
      };
    }
    throw error;
  }

  // LLM-level guard, defense-in-depth on top of the keyword pre-filter:
  // even if the model judges the (post-context) question out of scope,
  // show the fixed refusal copy rather than whatever free-text it
  // returned -- the model's own refusal wording isn't guaranteed safe.
  if (!result.in_scope) {
    return { answer: REFUSAL_MESSAGES.off_topic, highlight_grid_ids: [], in_scope: false };
  }

  return { answer: result.answer, highlight_grid_ids: result.highlight_grid_ids, in_scope: true };
}
