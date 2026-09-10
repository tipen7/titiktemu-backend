import supertest from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const response = await supertest(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
