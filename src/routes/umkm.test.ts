import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("GET /api/umkm", () => {
  it("returns a paginated list of real UMKM businesses", async () => {
    const response = await supertest(app).get("/api/umkm").query({ limit: 5 });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rows)).toBe(true);
    expect(response.body.rows.length).toBeGreaterThan(0);
    expect(response.body.rows.length).toBeLessThanOrEqual(5);
    expect(typeof response.body.total).toBe("number");
    expect(response.body.rows[0]).toHaveProperty("name");
    expect(response.body.rows[0]).toHaveProperty("grid_id");
  });

  it("filters by district", async () => {
    const response = await supertest(app)
      .get("/api/umkm")
      .query({ district: "Dukuh Atas" });
    expect(response.status).toBe(200);
    for (const row of response.body.rows) {
      expect(row.district_name).toBe("Dukuh Atas");
    }
  });

  it("returns 400 for an out-of-range ews_code", async () => {
    const response = await supertest(app)
      .get("/api/umkm")
      .query({ ews_code: 5 });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/umkm/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const response = await supertest(app).get("/api/umkm/does-not-exist");
    expect(response.status).toBe(404);
  });

  it("returns a business's detail for a real id", async () => {
    const list = await supertest(app).get("/api/umkm").query({ limit: 1 });
    const id = list.body.rows[0].id;

    const response = await supertest(app).get(`/api/umkm/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
  });
});

describe("GET /api/dashboard-summary", () => {
  it("returns the latest dashboard summary", async () => {
    const response = await supertest(app).get("/api/dashboard-summary");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("total_grid_cells");
    expect(response.body).toHaveProperty("ews_validation_accuracy_pct");
  });
});

describe("GET /api/policy-recommendations", () => {
  it("returns a list of real policy recommendations", async () => {
    const response = await supertest(app).get("/api/policy-recommendations");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("returns 400 for an invalid recommendation_type", async () => {
    const response = await supertest(app)
      .get("/api/policy-recommendations")
      .query({ recommendation_type: "not-a-real-type" });
    expect(response.status).toBe(400);
  });
});
