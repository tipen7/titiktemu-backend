import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";
import { getTestAccessToken } from "../test-utils/auth.js";

// Requires supabase/migrations/005_umkm_self_reports.sql applied against
// this project's DATABASE_URL, and `pnpm seed:test-users` run against its
// SUPABASE_URL, so the umkm/operator_tod test accounts and the
// umkm_self_reports table both exist.
describe("POST /api/umkm-self-reports", () => {
  it("returns 401 with no bearer token", async () => {
    const response = await supertest(app)
      .post("/api/umkm-self-reports")
      .send({ business_name: "Warung Test", latitude: -6.2, longitude: 106.8 });
    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-umkm role", async () => {
    const token = await getTestAccessToken("operator_tod");
    const response = await supertest(app)
      .post("/api/umkm-self-reports")
      .set("Authorization", `Bearer ${token}`)
      .send({ business_name: "Warung Test", latitude: -6.2, longitude: 106.8 });
    expect(response.status).toBe(403);
  });

  it("submits a self-report for an umkm-role user", async () => {
    const token = await getTestAccessToken("umkm");
    const response = await supertest(app)
      .post("/api/umkm-self-reports")
      .set("Authorization", `Bearer ${token}`)
      .send({
        business_name: "Warung Test",
        latitude: -6.2,
        longitude: 106.8,
        tenant_type: "umkm_tetap",
        revenue_per_month_idr: 5_000_000,
        rent_price_amount: 13_000_000,
        rent_period_unit: "bulan",
      });
    expect(response.status).toBe(201);
    expect(response.body.business_name).toBe("Warung Test");
    expect(response.body.status).toBe("pending");
  });

  it("returns 400 for a missing business_name", async () => {
    const token = await getTestAccessToken("umkm");
    const response = await supertest(app)
      .post("/api/umkm-self-reports")
      .set("Authorization", `Bearer ${token}`)
      .send({ latitude: -6.2, longitude: 106.8 });
    expect(response.status).toBe(400);
  });
});

describe("GET /api/umkm-self-reports", () => {
  it("returns 401 with no bearer token", async () => {
    const response = await supertest(app).get("/api/umkm-self-reports");
    expect(response.status).toBe(401);
  });

  it("returns 403 for a umkm-role caller", async () => {
    const token = await getTestAccessToken("umkm");
    const response = await supertest(app)
      .get("/api/umkm-self-reports")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it("lists self-reports for an operator", async () => {
    const token = await getTestAccessToken("operator_tod");
    const response = await supertest(app)
      .get("/api/umkm-self-reports")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rows)).toBe(true);
    expect(typeof response.body.total).toBe("number");
  });
});
