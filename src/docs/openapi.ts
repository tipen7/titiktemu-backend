// Hand-maintained OpenAPI document. Add a path entry here whenever a new
// endpoint is added to src/routes — this is the single source of truth for
// pnpm dev-time API docs, not generated from route/controller code.
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "TitikTemu Backend API",
    version: "1.0.0",
    description:
      "API Gateway & Auth service for TitikTemu. Includes liveness/status; zones/reallocation/model-accuracy/umkm/dashboard-summary/policy-recommendations (reading titiktemu-analytics' precomputed output tables); umkm-self-reports and reallocation-requests (UMKM-submitted, operator-reviewed write paths); and the Asisten AI TitikTemu chatbot (Gemini).",
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
    "/zones": {
      get: {
        summary: "All scored grid cells as GeoJSON",
        description:
          "Reads titiktemu-analytics' spatial_grids_geojson view -- one Feature per grid cell, with district_name/ews_code/vulnerability_index/matching_score properties. Powers the Discovery Map's base layer.",
        responses: {
          "200": {
            description: "GeoJSON FeatureCollection",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GeoJsonFeatureCollection",
                },
              },
            },
          },
        },
      },
    },
    "/zones/lookup": {
      get: {
        summary: "Zone detail for a single location",
        description:
          "Point-in-polygon lookup against the latest batch-scored grid. Powers the UMKM Self Discovery Tracker's own-location detail panel.",
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
        ],
        responses: {
          "200": {
            description: "Zone detail",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ZoneDetail" },
              },
            },
          },
          "404": { description: "Location is outside the study area" },
          "400": { description: "Invalid lat/lng" },
        },
      },
    },
    "/reallocation": {
      get: {
        summary: "Reallocation candidates for a location",
        description:
          "Looks up the zone at the given location, then returns its precomputed reallocation_candidates (only available for bahaya/high-risk zones today -- see ReallocationResult.message otherwise). Powers the Smart Tenant Matching Engine's 'View Reallocation' button.",
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
        ],
        responses: {
          "200": {
            description: "Reallocation result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReallocationResult" },
              },
            },
          },
          "404": { description: "Location is outside the study area" },
          "400": { description: "Invalid lat/lng" },
        },
      },
    },
    "/model-accuracy": {
      get: {
        summary: "Latest EWS/matching_score model accuracy",
        description:
          "One accuracy figure for the whole latest batch run (not per grid cell) -- every EWS classification and matching_score in that run comes from the same fitted XGBoost model. Powers the confidence badge shown alongside predictions.",
        responses: {
          "200": {
            description: "Model accuracy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ModelAccuracy" },
              },
            },
          },
          "404": {
            description: "No model accuracy recorded yet",
          },
        },
      },
    },
    "/chat": {
      post: {
        summary: "Asisten AI TitikTemu chatbot",
        description:
          "Scoped to TitikTemu's domain only (zones, gentrification, reallocation, tenant matching, ESG) -- rejects off-topic and prompt-injection messages before and after the LLM call (see src/services/chat). For both Operator and UMKM user surfaces, distinguished by `role`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message", "role"],
                properties: {
                  message: { type: "string", maxLength: 1000 },
                  role: { type: "string", enum: ["operator", "umkm"] },
                  history: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        role: { type: "string", enum: ["user", "assistant"] },
                        text: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Chat response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    answer: { type: "string" },
                    highlight_grid_ids: {
                      type: "array",
                      items: { type: "string" },
                    },
                    in_scope: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "Validation failed" },
        },
      },
    },
    "/umkm-self-reports": {
      post: {
        summary: "Submit a UMKM self-report survey",
        description:
          "A UMKM user submits their own business data (rent, revenue, tenant info) for a future titiktemu-analytics survey import. Requires role 'umkm'.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUmkmSelfReportBody" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created self-report",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UmkmSelfReport" },
              },
            },
          },
          "400": { description: "Validation failed" },
          "401": { description: "Missing, invalid, or expired token" },
          "403": { description: "Caller is not role 'umkm'" },
        },
      },
      get: {
        summary: "List UMKM self-reports for operator review",
        description:
          "Paginated/filterable list of submitted self-reports. Requires role 'operator_tod' or 'pemda_admin'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "reviewed", "exported"],
            },
          },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Self-reports",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UmkmSelfReport" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing, invalid, or expired token" },
          "403": {
            description: "Caller is not role 'operator_tod'/'pemda_admin'",
          },
        },
      },
    },
    "/reallocation-requests": {
      post: {
        summary: "Submit a reallocation request ('Pengajuan Realokasi')",
        description:
          "A UMKM user requests relocating to one specific reallocation candidate grid (from GET /api/reallocation). Requires role 'umkm'. Distinct from the read-only 'Laporan Alokasi' feature (/api/policy-recommendations).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateReallocationRequestBody",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created reallocation request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReallocationRequest" },
              },
            },
          },
          "400": { description: "Validation failed" },
          "401": { description: "Missing, invalid, or expired token" },
          "403": { description: "Caller is not role 'umkm'" },
        },
      },
      get: {
        summary: "List reallocation requests for operator review",
        description:
          "Paginated/filterable list of submitted reallocation requests. Requires role 'operator_tod' or 'pemda_admin'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
            },
          },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "offset", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "Reallocation requests",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    rows: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/ReallocationRequest",
                      },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing, invalid, or expired token" },
          "403": {
            description: "Caller is not role 'operator_tod'/'pemda_admin'",
          },
        },
      },
    },
    "/reallocation-requests/{id}": {
      patch: {
        summary: "Approve or reject a reallocation request",
        description:
          "Operator decision on a pending reallocation request. Requires role 'operator_tod' or 'pemda_admin'.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["approved", "rejected"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated reallocation request",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReallocationRequest" },
              },
            },
          },
          "400": { description: "Validation failed" },
          "401": { description: "Missing, invalid, or expired token" },
          "403": {
            description: "Caller is not role 'operator_tod'/'pemda_admin'",
          },
          "404": { description: "Reallocation request not found" },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Current authenticated user's profile",
        description:
          "Verifies the Supabase access token in Authorization: Bearer <token> and returns the matching public.users profile (role, name). Powers the sidebar account footer and role-aware UI.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "The authenticated user's profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthUser" },
              },
            },
          },
          "401": { description: "Missing, invalid, or expired token" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      AuthUser: {
        type: "object",
        required: ["id", "email", "role", "fullName"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          role: {
            type: "string",
            enum: ["pemda_admin", "operator_tod", "umkm", "public_user"],
          },
          fullName: { type: "string", nullable: true },
        },
      },
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
      GeoJsonFeatureCollection: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["FeatureCollection"] },
          features: { type: "array", items: { type: "object" } },
        },
      },
      ModelAccuracy: {
        type: "object",
        description:
          "Leave-one-out cross-validated accuracy against real, measured " +
          "UMKM survey vulnerability -- NOT the XGBoost/GWR surface-fit " +
          "figure (which is near-100% by construction and not exposed via " +
          "this API). confidence_level reflects the real validation sample " +
          "size (n), not the accuracy percentage itself.",
        properties: {
          accuracy_pct: { type: "number" },
          n: {
            type: "integer",
            description: "Real survey points used for validation.",
          },
          ci_95_low_pct: { type: "number" },
          ci_95_high_pct: { type: "number" },
          confidence_level: {
            type: "string",
            enum: ["high", "moderate", "low"],
          },
          computed_at: { type: "string", format: "date-time" },
        },
      },
      ZoneDetail: {
        type: "object",
        properties: {
          grid_id: { type: "string" },
          district_name: { type: "string", nullable: true },
          ews_code: { type: "integer", enum: [0, 1, 2] },
          zone_color: { type: "string", enum: ["green", "yellow", "red"] },
          zone_label: { type: "string", enum: ["aman", "waspada", "bahaya"] },
          vulnerability_index: { type: "number" },
          matching_score: { type: "number" },
          narrative: { type: "string", nullable: true },
          recommendation_type: { type: "string", nullable: true },
          model_accuracy: {
            allOf: [{ $ref: "#/components/schemas/ModelAccuracy" }],
            nullable: true,
          },
        },
      },
      ReallocationResult: {
        type: "object",
        properties: {
          found: { type: "boolean" },
          eligible: { type: "boolean" },
          zone: { $ref: "#/components/schemas/ZoneDetail" },
          candidates: { type: "array", items: { type: "object" } },
          message: { type: "string" },
        },
      },
      CreateUmkmSelfReportBody: {
        type: "object",
        required: ["business_name", "latitude", "longitude"],
        properties: {
          business_name: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          description: { type: "string" },
          tenant_type: {
            type: "string",
            enum: [
              "umkm_tetap",
              "umkm_seasonal",
              "franchise_tetap",
              "franchise_seasonal",
            ],
          },
          tenant_area_m2: { type: "number" },
          target_market: { type: "string" },
          rent_price_amount: { type: "number" },
          rent_period_unit: {
            type: "string",
            enum: ["hari", "bulan", "tahun"],
          },
          rent_expiry_date: { type: "string", format: "date" },
          revenue_per_month_idr: { type: "number" },
          txn_high_idr: { type: "number" },
          txn_normal_idr: { type: "number" },
          txn_low_idr: { type: "number" },
          transaction_per_buyer_idr: { type: "number" },
          rent_trend_pct: { type: "number" },
        },
      },
      UmkmSelfReport: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          submitted_by: { type: "string", format: "uuid", nullable: true },
          business_name: { type: "string" },
          description: { type: "string", nullable: true },
          tenant_type: { type: "string", nullable: true },
          latitude: { type: "number" },
          longitude: { type: "number" },
          tenant_area_m2: { type: "number", nullable: true },
          target_market: { type: "string", nullable: true },
          rent_price_amount: { type: "number", nullable: true },
          rent_period_unit: { type: "string", nullable: true },
          rent_expiry_date: { type: "string", format: "date", nullable: true },
          revenue_per_month_idr: { type: "number", nullable: true },
          txn_high_idr: { type: "number", nullable: true },
          txn_normal_idr: { type: "number", nullable: true },
          txn_low_idr: { type: "number", nullable: true },
          transaction_per_buyer_idr: { type: "number", nullable: true },
          rent_trend_pct: { type: "number", nullable: true },
          status: { type: "string", enum: ["pending", "reviewed", "exported"] },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      CreateReallocationRequestBody: {
        type: "object",
        required: ["origin_grid_id", "requested_grid_id"],
        properties: {
          origin_grid_id: { type: "string" },
          requested_grid_id: { type: "string" },
          requested_district: { type: "string" },
          distance_m: { type: "number" },
          matching_score: { type: "number" },
          note: { type: "string" },
        },
      },
      ReallocationRequest: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          submitted_by: { type: "string", format: "uuid", nullable: true },
          origin_grid_id: { type: "string" },
          requested_grid_id: { type: "string" },
          requested_district: { type: "string", nullable: true },
          distance_m: { type: "number", nullable: true },
          matching_score: { type: "number", nullable: true },
          note: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "approved", "rejected"] },
          reviewed_by: { type: "string", format: "uuid", nullable: true },
          reviewed_at: { type: "string", format: "date-time", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
} as const;
