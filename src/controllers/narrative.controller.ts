import type { RequestHandler } from "express";
import { generateNarrative } from "../services/narrative.service.js";
import { policyNarrativePayloadSchema } from "../validators/gemini.validators.js";

export const narrativeController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const parsed = policyNarrativePayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const result = await generateNarrative(parsed.data);
    response.json(result);
  } catch (error) {
    next(error);
  }
};
