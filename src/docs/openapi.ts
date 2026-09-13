// Hand-maintained OpenAPI document. Add a path entry here whenever a new
// endpoint is added to src/routes — this is the single source of truth for
// pnpm dev-time API docs, not generated from route/controller code.
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TitikTemu Backend API",
    version: "1.0.0",
    description:
      "API Gateway & Auth service for TitikTemu. Includes liveness/status, walking-distance isochrone (OSM + pgRouting), XGBoost scoring proxy endpoints (mock until the ML team's service is wired up), and LLM narrative orchestration (Gemini).",
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
    "/isochrone": {
      get: {
        summary: "Walking-distance isochrone",
        description:
          "Reachable OSM road network within a walking distance of a point (default 800m / ~10 min), computed with pgRouting. Requires the routing graph to be built first (see rebuildRoadTopology, run automatically after OSM ingest).",
        parameters: [
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "lng",
            in: "query",
            required: true,
            schema: { type: "number" },
          },
          {
            name: "maxDistanceMeters",
            in: "query",
            required: false,
            schema: { type: "number", default: 800, maximum: 2000 },
          },
        ],
        responses: {
          "200": {
            description: "Isochrone computed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IsochroneResponse" },
              },
            },
          },
          "400": { description: "Invalid query parameters" },
          "404": {
            description: "No road network found near the given location",
          },
        },
      },
    },
    "/score/risk-classification": {
      post: {
        summary: "EWS Risk Classification (proxy)",
        description:
          "Forwards to the ML team's XGBoost scoring service via ScoringAdapter — MockScoringAdapter (deterministic placeholder) until ML_SCORING_SERVICE_URL is set.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RiskClassificationRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Risk classification result",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RiskClassificationResult",
                },
              },
            },
          },
          "400": { description: "Invalid request body" },
        },
      },
    },
    "/score/tenant-matching": {
      post: {
        summary: "Smart Tenant Matching Score (proxy)",
        description:
          "Forwards to the ML team's XGBoost scoring service via ScoringAdapter — MockScoringAdapter (deterministic placeholder) until ML_SCORING_SERVICE_URL is set.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TenantMatchingRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Tenant matching result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TenantMatchingResult" },
              },
            },
          },
          "400": { description: "Invalid request body" },
        },
      },
    },
    "/narrative": {
      post: {
        summary: "LLM policy narrative orchestration",
        description:
          "Generates a short policy narrative from an already-computed JSON payload via Gemini (Asumsi A5: text only, never numeric calculation). Falls back to `{ narrative: null, generatedByLlm: false }` — HTTP 200, not an error — if Gemini fails or exceeds its 5s timeout.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PolicyNarrativePayload" },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Narrative generated, or fallback if Gemini was unavailable",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NarrativeResponse" },
              },
            },
          },
          "400": { description: "Invalid request body" },
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
      IsochroneResponse: {
        type: "object",
        required: [
          "origin",
          "maxDistanceMeters",
          "reachedNodeCount",
          "hull",
          "edges",
        ],
        properties: {
          origin: {
            type: "object",
            properties: { lat: { type: "number" }, lng: { type: "number" } },
          },
          maxDistanceMeters: { type: "number" },
          reachedNodeCount: { type: "integer" },
          hull: {
            type: "object",
            nullable: true,
            description: "GeoJSON Polygon",
          },
          edges: { type: "array", items: { type: "object" } },
        },
      },
      GridFeatures: {
        type: "object",
        properties: {
          poiCount: { type: "number" },
          distExitTolM: { type: "number" },
          distStationM: { type: "number" },
          ndbiMean: { type: "number" },
          kepadatanPenduduk: { type: "number" },
          rentSurgeReported: { type: "boolean" },
        },
      },
      RiskClassificationRequest: {
        type: "object",
        required: ["gridId", "features"],
        properties: {
          gridId: { type: "integer" },
          features: { $ref: "#/components/schemas/GridFeatures" },
        },
      },
      RiskClassificationResult: {
        type: "object",
        required: ["gridId", "riskCode"],
        properties: {
          gridId: { type: "integer" },
          riskCode: { type: "integer", enum: [0, 1, 2] },
          confidence: { type: "number" },
        },
      },
      TenantMatchingRequest: {
        type: "object",
        required: ["gridId", "businessCategory"],
        properties: {
          gridId: { type: "integer" },
          businessCategory: { type: "string" },
          features: { $ref: "#/components/schemas/GridFeatures" },
        },
      },
      TenantMatchingResult: {
        type: "object",
        required: ["gridId", "businessCategory", "matchScore"],
        properties: {
          gridId: { type: "integer" },
          businessCategory: { type: "string" },
          matchScore: { type: "number" },
        },
      },
      PolicyNarrativePayload: {
        type: "object",
        required: ["gridId", "riskCode", "keyMetrics"],
        properties: {
          gridId: { type: "integer" },
          riskCode: { type: "integer", enum: [0, 1, 2] },
          keyMetrics: {
            type: "object",
            additionalProperties: { type: "number" },
          },
        },
      },
      NarrativeResponse: {
        type: "object",
        required: ["narrative", "generatedByLlm"],
        properties: {
          narrative: { type: "string", nullable: true },
          generatedByLlm: { type: "boolean" },
        },
      },
    },
  },
} as const;
