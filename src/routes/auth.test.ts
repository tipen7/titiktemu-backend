import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("GET /api/auth/me", () => {
  it("returns 401 with no bearer token", async () => {
    const response = await supertest(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("returns 401 with a garbage token", async () => {
    const response = await supertest(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(response.status).toBe(401);
  });
});
