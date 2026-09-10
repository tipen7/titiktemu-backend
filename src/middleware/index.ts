import type { ErrorRequestHandler, RequestHandler } from "express";

// Cross-cutting HTTP behavior, such as logging or authentication, belongs here.
export const requestLogger: RequestHandler = (request, _response, next) => {
  console.log(`${request.method} ${request.originalUrl}`);
  next();
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "Not Found" });
};

// swagger-ui-express renders an inline bootstrap script; helmet's default CSP
// blocks inline scripts, so it's relaxed for the docs path only.
export const disableCspForDocs: RequestHandler = (_request, response, next) => {
  response.removeHeader("Content-Security-Policy");
  next();
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error);
  response.status(500).json({ error: "Internal Server Error" });
};
