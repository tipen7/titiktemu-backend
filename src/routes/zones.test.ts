import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

// Coordinates below are real, verified grid cell centroids from
// titiktemu-analytics' last batch run against the real UMKM survey --
// confirmed via direct query against spatial_grids/gentrification_risk_scores
// before writing this test, not guessed. These tests are read-only and
// require the same live DATABASE_URL the rest of this service uses.
const DANGER_ZONE_POINT = { lat: -6.24397624167159, lng: 106.799125961985 }; // grid_000_000, ews_code 2
const SAFE_ZONE_POINT = { lat: -6.22137185591368, lng: 106.79904893291 }; // grid_000_010, ews_code 0
const OUTSIDE_STUDY_AREA_POINT = { lat: 0, lng: 0 };

describe("GET /api/zones", () => {
  it("returns a GeoJSON FeatureCollection covering the study area", async () => {
    const response = await supertest(app).get("/api/zones");
    expect(response.status).toBe(200);
    expect(response.body.type).toBe("FeatureCollection");
    expect(Array.isArray(response.body.features)).toBe(true);
    expect(response.body.features.length).toBeGreaterThan(0);
    expect(response.body.features[0].type).toBe("Feature");
    expect(response.body.features[0].geometry.type).toBe("Polygon");
  });
});

describe("GET /api/zones/lookup", () => {
  it("returns zone detail for a known danger-zone location", async () => {
    const response = await supertest(app)
      .get("/api/zones/lookup")
      .query(DANGER_ZONE_POINT);
    expect(response.status).toBe(200);
    expect(response.body.grid_id).toBe("grid_000_000");
    expect(response.body.ews_code).toBe(2);
    expect(response.body.zone_color).toBe("red");
    expect(response.body.zone_label).toBe("bahaya");
    // Real value from analytics' dashboard_summary -- leave-one-out
    // cross-validated against n=119 real, measured UMKM survey points
    // (v3 + v5 only; v4 retired -- its revenue field was a disclosed
    // mechanical proxy, not an independent measurement) with CV-selected
    // GWR bandwidth (see that repo's
    // src/modeling/xgboost_ews.validate_ews_against_survey). NOT the old
    // XGBoost/GWR surface-fit figure (~60-100%, near-100% by construction
    // and intentionally not exposed by this API) -- that number measured
    // curve-fitting fidelity, not real-world accuracy. This number moves
    // as analytics' survey data grows -- re-verify against a live query
    // before updating it again, don't just bump it to whatever a new run prints.
    expect(response.body.model_accuracy.accuracy_pct).toBeCloseTo(64.7, 1);
    expect(response.body.model_accuracy.n).toBe(119);
    expect(response.body.model_accuracy.confidence_level).toBe("high");
  });

  it("returns zone detail for a known safe-zone location", async () => {
    const response = await supertest(app)
      .get("/api/zones/lookup")
      .query(SAFE_ZONE_POINT);
    expect(response.status).toBe(200);
    expect(response.body.ews_code).toBe(0);
    expect(response.body.zone_color).toBe("green");
  });

  it("returns 404 outside the study area", async () => {
    const response = await supertest(app)
      .get("/api/zones/lookup")
      .query(OUTSIDE_STUDY_AREA_POINT);
    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid coordinates", async () => {
    const response = await supertest(app)
      .get("/api/zones/lookup")
      .query({ lat: "not-a-number", lng: 106.8 });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/reallocation", () => {
  it("returns eligible reallocation candidates for a danger-zone location", async () => {
    const response = await supertest(app)
      .get("/api/reallocation")
      .query(DANGER_ZONE_POINT);
    expect(response.status).toBe(200);
    expect(response.body.found).toBe(true);
    expect(response.body.eligible).toBe(true);
    expect(Array.isArray(response.body.candidates)).toBe(true);
    expect(response.body.candidates.length).toBeGreaterThan(0);
    expect(response.body.candidates[0]).toHaveProperty("recommended_grid_id");
    expect(response.body.candidates[0]).toHaveProperty("recommended_feature");
  });

  it("returns not-eligible with no candidates for a safe-zone location", async () => {
    const response = await supertest(app)
      .get("/api/reallocation")
      .query(SAFE_ZONE_POINT);
    expect(response.status).toBe(200);
    expect(response.body.found).toBe(true);
    expect(response.body.eligible).toBe(false);
    expect(response.body.candidates).toEqual([]);
  });

  it("returns 404 outside the study area", async () => {
    const response = await supertest(app)
      .get("/api/reallocation")
      .query(OUTSIDE_STUDY_AREA_POINT);
    expect(response.status).toBe(404);
  });
});

describe("GET /api/model-accuracy", () => {
  it("returns the latest EWS model accuracy with the correct confidence level", async () => {
    const response = await supertest(app).get("/api/model-accuracy");
    expect(response.status).toBe(200);
    expect(response.body.accuracy_pct).toBeCloseTo(64.7, 1);
    expect(response.body.n).toBe(119);
    expect(response.body.ci_95_low_pct).toBeCloseTo(55.8, 1);
    expect(response.body.ci_95_high_pct).toBeCloseTo(72.7, 1);
    expect(response.body.confidence_level).toBe("high");
    expect(typeof response.body.computed_at).toBe("string");
  });
});
