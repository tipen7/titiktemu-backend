import type {
  RiskClassificationRequest,
  RiskClassificationResult,
  TenantMatchingRequest,
  TenantMatchingResult,
} from "../../validators/scoring.validators.js";

export interface ScoringAdapter {
  classifyRisk(
    request: RiskClassificationRequest,
  ): Promise<RiskClassificationResult>;
  matchTenant(request: TenantMatchingRequest): Promise<TenantMatchingResult>;
}
