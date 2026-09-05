import type { RequestHandler } from "express";

// Controllers translate HTTP requests into service calls and HTTP responses.
export const placeholderController: RequestHandler = (_request, response) => {
  response.json({ status: "not-configured" });
};
