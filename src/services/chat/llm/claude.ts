import { appConfig } from "../../../config/index.js";
import { buildSystemPrompt, parseModelJson, stubResult } from "./prompt.js";
import type { ChatRole, ChatTurn, LlmChatResult } from "./types.js";
import { LlmQuotaExceededError } from "./types.js";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export async function callClaude(
  message: string,
  role: ChatRole,
  context: string,
  history: ChatTurn[],
): Promise<LlmChatResult> {
  if (!appConfig.anthropicApiKey) {
    return stubResult("ANTHROPIC_API_KEY", message);
  }

  const systemPrompt = buildSystemPrompt(role, context);

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": appConfig.anthropicApiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: appConfig.anthropicModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...history.map((turn) => ({ role: turn.role, content: turn.text })),
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Could not reach Claude API: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new LlmQuotaExceededError(
        `Claude API returned 429: ${body.slice(0, 200)}`,
      );
    }
    throw new Error(
      `Claude API returned ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    content?: { text?: string }[];
  };
  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error(
      "Malformed Claude response, refusing to persist it: no text in response",
    );
  }

  return parseModelJson(text);
}
