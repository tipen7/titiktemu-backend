import type { RequestHandler } from "express";
import { getIsochrone } from "../services/isochrone.service.js";
import { isochroneQuerySchema } from "../validators/isochrone.validators.js";

export const isochroneController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const parsed = isochroneQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "Invalid query", details: parsed.error.flatten() });
      return;
    }

    const result = await getIsochrone(parsed.data);
    if (!result) {
      response
        .status(404)
        .json({ error: "No road network found near the given location" });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
};
