import { z } from "zod";

// Payload shape for narrative generation (Asumsi A5): structured JSON in,
// text out — Gemini is never asked to do numeric calculation.
export const policyNarrativePayloadSchema = z.object({
  gridId: z.number().int(),
  riskCode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  keyMetrics: z.record(z.string(), z.number()),
});
export type PolicyNarrativePayload = z.infer<
  typeof policyNarrativePayloadSchema
>;
