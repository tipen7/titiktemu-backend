import {
  type RiskClassificationRequest,
  type RiskClassificationResult,
  riskClassificationResultSchema,
  type TenantMatchingRequest,
  type TenantMatchingResult,
  tenantMatchingResultSchema,
} from "../../validators/scoring.validators.js";
import type { ScoringAdapter } from "./scoring-adapter.interface.js";

// Deterministic placeholder scoring, not a model — stands in until the ML
// team's XGBoost service is up and ML_SCORING_SERVICE_URL is set (see
// getScoringAdapter()). Just enough to exercise the gateway route end to
// end.
export class MockScoringAdapter implements ScoringAdapter {
  async classifyRisk(
    request: RiskClassificationRequest,
  ): Promise<RiskClassificationResult> {
    const riskCode =
      request.features.ndbiMean > 0.2
        ? 2
        : request.features.rentSurgeReported
          ? 1
          : 0;
    return riskClassificationResultSchema.parse({
      gridId: request.gridId,
      riskCode,
      confidence: 0.5,
    });
  }

  async matchTenant(
    request: TenantMatchingRequest,
  ): Promise<TenantMatchingResult> {
    return tenantMatchingResultSchema.parse({
      gridId: request.gridId,
      businessCategory: request.businessCategory,
      matchScore: 65,
    });
  }
}
