import {
  type RiskClassificationRequest,
  type RiskClassificationResult,
  riskClassificationResultSchema,
  type TenantMatchingRequest,
  type TenantMatchingResult,
  tenantMatchingResultSchema,
} from "../../validators/scoring.validators.js";
import type { ScoringAdapter } from "./scoring-adapter.interface.js";

// Kept under 1.5s so the < 1.5s p95 SLA (test.md) still holds after gateway
// overhead on top of this call.
const REQUEST_TIMEOUT_MS = 1_200;

export class HttpScoringAdapter implements ScoringAdapter {
  constructor(private readonly baseUrl: string) {}

  async classifyRisk(
    request: RiskClassificationRequest,
  ): Promise<RiskClassificationResult> {
    const body = await this.post("/score/risk-classification", request);
    return riskClassificationResultSchema.parse(body);
  }

  async matchTenant(
    request: TenantMatchingRequest,
  ): Promise<TenantMatchingResult> {
    const body = await this.post("/score/tenant-matching", request);
    return tenantMatchingResultSchema.parse(body);
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `ML scoring service request failed with status ${response.status}`,
        );
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
