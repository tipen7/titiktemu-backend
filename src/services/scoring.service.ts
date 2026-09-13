import { getScoringAdapter } from "../adapters/scoring/index.js";
import type {
  RiskClassificationRequest,
  RiskClassificationResult,
  TenantMatchingRequest,
  TenantMatchingResult,
} from "../validators/scoring.validators.js";

export async function classifyRisk(
  request: RiskClassificationRequest,
): Promise<RiskClassificationResult> {
  return getScoringAdapter().classifyRisk(request);
}

export async function matchTenant(
  request: TenantMatchingRequest,
): Promise<TenantMatchingResult> {
  return getScoringAdapter().matchTenant(request);
}
