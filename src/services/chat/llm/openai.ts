import { appConfig } from "../../../config/index.js";
import { buildSystemPrompt, parseModelJson, stubResult } from "./prompt.js";
import type { ChatRole, ChatTurn, LlmChatResult } from "./types.js";
import { LlmQuotaExceededError } from "./types.js";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

export async function callOpenAi(
  message: string,
  role: ChatRole,
  context: string,
  history: ChatTurn[],
): Promise<LlmChatResult> {
  if (!appConfig.openaiApiKey) {
    return stubResult("OPENAI_API_KEY", message);
  }

  const systemPrompt = buildSystemPrompt(role, context);

  let response: Response;
  try {
    response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openaiModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((turn) => ({ role: turn.role, content: turn.text })),
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Could not reach OpenAI API: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new LlmQuotaExceededError(
        `OpenAI API returned 429: ${body.slice(0, 200)}`,
      );
    }
    throw new Error(
      `OpenAI API returned ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(
      "Malformed OpenAI response, refusing to persist it: no text in response",
    );
  }

  return parseModelJson(text);
}
