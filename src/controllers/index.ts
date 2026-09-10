import type { RequestHandler } from "express";
import { getServiceStatus } from "../services/index.js";

// Controllers translate HTTP requests into service calls and HTTP responses.
export const healthController: RequestHandler = (_request, response) => {
  response.json({ status: "ok" });
};

export const statusController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const result = await getServiceStatus();
    response.status(result.status === "ok" ? 200 : 503).json(result);
  } catch (error) {
    next(error);
  }
};
