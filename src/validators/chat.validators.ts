import { z } from "zod";

// message length capped -- a very long message is either abuse or not a
// real chat question; conversation history capped similarly so a client
// can't balloon the prompt sent to Gemini on every turn.
export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  role: z.enum(["operator", "umkm"]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(1000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});
export type ChatRequestBody = z.infer<typeof chatRequestSchema>;
