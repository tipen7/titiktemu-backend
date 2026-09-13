import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { getUserProfile } from "../services/index.js";
import type { UserRole } from "../types/auth.js";

// Cross-cutting HTTP behavior, such as logging or authentication, belongs here.
export const requestLogger: RequestHandler = (request, _response, next) => {
  console.log(`${request.method} ${request.originalUrl}`);
  next();
};

// Verifies the Supabase access token in Authorization: Bearer <token>,
// then loads the matching public.users profile (role, name) and attaches
// it to request.user for downstream handlers/requireRole.
export const requireAuth: RequestHandler = async (request, response, next) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;
    if (!token) {
      response.status(401).json({ error: "Missing bearer token" });
      return;
    }

    const {
      data: { user },
      error,
    } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) {
      response.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      response.status(401).json({ error: "No profile found for this user" });
      return;
    }

    request.user = profile;
    next();
  } catch (error) {
    next(error);
  }
};

// Use after requireAuth. Returns 403 if request.user's role isn't allowed.
export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: "Insufficient role" });
      return;
    }
    next();
  };
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
  if (error instanceof ZodError) {
    response
      .status(400)
      .json({ error: "Validation failed", details: error.issues });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Internal Server Error" });
};
