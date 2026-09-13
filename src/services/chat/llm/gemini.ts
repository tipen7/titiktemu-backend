// The actual LLM call -- same REST pattern as titiktemu-analytics'
// src/narrative/gemini_client.py (direct fetch to the Gemini API, no SDK
// dependency added for one call site).

import { appConfig } from "../../../config/index.js";
import { buildSystemPrompt, parseModelJson, stubResult } from "./prompt.js";
import type { ChatRole, ChatTurn, LlmChatResult } from "./types.js";
import { LlmQuotaExceededError } from "./types.js";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

export async function callGemini(
  message: string,
  role: ChatRole,
  context: string,
  history: ChatTurn[],
): Promise<LlmChatResult> {
  if (!appConfig.geminiApiKey) {
    return stubResult("GEMINI_API_KEY", message);
  }

  const systemPrompt = buildSystemPrompt(role, context);
  const conversation = history
    .map(
      (turn) =>
        `${turn.role === "user" ? "Pengguna" : "Asisten"}: ${turn.text}`,
    )
    .join("\n");
  const prompt = `${systemPrompt}\n\n${conversation ? `${conversation}\n` : ""}Pengguna: ${message}`;

  const url = GEMINI_ENDPOINT.replace("{model}", appConfig.geminiModel);
  let response: Response;
  try {
    response = await fetch(`${url}?key=${appConfig.geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(`Could not reach Gemini API: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new LlmQuotaExceededError(
        `Gemini API returned 429: ${body.slice(0, 200)}`,
      );
    }
    throw new Error(
      `Gemini API returned ${response.status}: ${body.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(
      "Malformed Gemini response, refusing to persist it: no text in response",
    );
  }

  return parseModelJson(text);
}
