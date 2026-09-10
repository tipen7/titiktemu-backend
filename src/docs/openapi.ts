// Hand-maintained OpenAPI document. Add a path entry here whenever a new
// endpoint is added to src/routes — this is the single source of truth for
// pnpm dev-time API docs, not generated from route/controller code.
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TitikTemu Backend API",
    version: "1.0.0",
    description:
      "API Gateway & Auth service for TitikTemu. Fase 0 scope: liveness/status endpoints only.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/health": {
      get: {
        summary: "Liveness check",
        description:
          "Returns 200 if the process is up. Does not check dependencies.",
        responses: {
          "200": {
            description: "Service is alive",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/status": {
      get: {
        summary: "Liveness + database connectivity check",
        description:
          "Flows Controller -> Service -> Repository -> DB. Returns 503 when the database is unreachable.",
        responses: {
          "200": {
            description: "Service and database are healthy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatusResponse" },
              },
            },
          },
          "503": {
            description: "Service is degraded (database unreachable)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatusResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["ok"] },
        },
      },
      StatusResponse: {
        type: "object",
        required: ["status", "database"],
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          database: { type: "string", enum: ["ok", "error"] },
        },
      },
    },
  },
} as const;
