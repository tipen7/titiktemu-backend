import type { RequestHandler } from "express";
import { classifyRisk, matchTenant } from "../services/scoring.service.js";
import {
  riskClassificationRequestSchema,
  tenantMatchingRequestSchema,
} from "../validators/scoring.validators.js";

export const riskClassificationController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const parsed = riskClassificationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const result = await classifyRisk(parsed.data);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const tenantMatchingController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const parsed = tenantMatchingRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const result = await matchTenant(parsed.data);
    response.json(result);
  } catch (error) {
    next(error);
  }
};
