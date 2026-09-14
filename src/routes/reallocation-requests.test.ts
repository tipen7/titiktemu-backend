import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";
import { getTestAccessToken } from "../test-utils/auth.js";

// Requires supabase/migrations/006_reallocation_requests.sql applied against
// this project's DATABASE_URL, and `pnpm seed:test-users` run against its
// SUPABASE_URL, so the umkm/operator_tod test accounts and the
// reallocation_requests table both exist.
async function twoRealGridIds(): Promise<[string, string]> {
  const response = await supertest(app).get("/api/umkm").query({ limit: 20 });
  const ids = [
    ...new Set(response.body.rows.map((r: { grid_id: string }) => r.grid_id)),
  ];
  if (ids.length < 2) {
    throw new Error(
      "Need at least two distinct grid_ids in umkm_businesses for this test",
    );
  }
  return [ids[0] as string, ids[1] as string];
}

describe("POST /api/reallocation-requests", () => {
  it("returns 401 with no bearer token", async () => {
    const response = await supertest(app)
      .post("/api/reallocation-requests")
      .send({ origin_grid_id: "x", requested_grid_id: "y" });
    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-umkm role", async () => {
    const token = await getTestAccessToken("operator_tod");
    const [origin, requested] = await twoRealGridIds();
    const response = await supertest(app)
      .post("/api/reallocation-requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ origin_grid_id: origin, requested_grid_id: requested });
    expect(response.status).toBe(403);
  });

  it("returns 400 for a missing requested_grid_id", async () => {
    const token = await getTestAccessToken("umkm");
    const response = await supertest(app)
      .post("/api/reallocation-requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ origin_grid_id: "some-grid" });
    expect(response.status).toBe(400);
  });

  it("submits a reallocation request for an umkm-role user", async () => {
    const token = await getTestAccessToken("umkm");
    const [origin, requested] = await twoRealGridIds();
    const response = await supertest(app)
      .post("/api/reallocation-requests")
      .set("Authorization", `Bearer ${token}`)
      .send({
        origin_grid_id: origin,
        requested_grid_id: requested,
        note: "Ingin pindah lebih dekat ke pasar",
      });
    expect(response.status).toBe(201);
    expect(response.body.origin_grid_id).toBe(origin);
    expect(response.body.requested_grid_id).toBe(requested);
    expect(response.body.status).toBe("pending");
  });
});

describe("GET /api/reallocation-requests", () => {
  it("returns 401 with no bearer token", async () => {
    const response = await supertest(app).get("/api/reallocation-requests");
    expect(response.status).toBe(401);
  });

  it("lists reallocation requests for an operator", async () => {
    const token = await getTestAccessToken("operator_tod");
    const response = await supertest(app)
      .get("/api/reallocation-requests")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rows)).toBe(true);
  });
});

describe("PATCH /api/reallocation-requests/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const token = await getTestAccessToken("operator_tod");
    const response = await supertest(app)
      .patch("/api/reallocation-requests/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "approved" });
    expect(response.status).toBe(404);
  });

  it("approves a pending request", async () => {
    const umkmToken = await getTestAccessToken("umkm");
    const [origin, requested] = await twoRealGridIds();
    const created = await supertest(app)
      .post("/api/reallocation-requests")
      .set("Authorization", `Bearer ${umkmToken}`)
      .send({ origin_grid_id: origin, requested_grid_id: requested });

    const operatorToken = await getTestAccessToken("operator_tod");
    const response = await supertest(app)
      .patch(`/api/reallocation-requests/${created.body.id}`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ status: "approved" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("approved");
    expect(response.body.reviewed_by).toBeTruthy();
  });
});
