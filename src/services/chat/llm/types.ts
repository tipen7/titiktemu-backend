export type ChatRole = "operator" | "umkm";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface LlmChatResult {
  in_scope: boolean;
  answer: string;
  highlight_grid_ids: string[];
}

// Thrown by any provider on HTTP 429 -- callers treat this as "try again
// later" rather than a hard failure (see chat/index.ts).
export class LlmQuotaExceededError extends Error {}
