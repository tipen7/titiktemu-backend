import type { RequestHandler } from "express";

// Cross-cutting HTTP behavior, such as logging or authentication, belongs here.
export const requestLogger: RequestHandler = (_request, _response, next) => {
  next();
};
