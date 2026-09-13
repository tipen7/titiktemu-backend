import { z } from "zod";

// Feature set from test.md's master_grid_dataset columns
// (poi_count, dist_to_exit_tol, dist_to_station, ndbi_mean,
// kepadatan_penduduk, rent_surge_reported).
const gridFeaturesSchema = z.object({
  poiCount: z.number().nonnegative(),
  distExitTolM: z.number().nonnegative(),
  distStationM: z.number().nonnegative(),
  ndbiMean: z.number().min(-1).max(1),
  kepadatanPenduduk: z.number().nonnegative(),
  rentSurgeReported: z.boolean(),
});

export const riskClassificationRequestSchema = z.object({
  gridId: z.number().int(),
  features: gridFeaturesSchema,
});
export type RiskClassificationRequest = z.infer<
  typeof riskClassificationRequestSchema
>;

export const riskClassificationResultSchema = z.object({
  gridId: z.number().int(),
  riskCode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  confidence: z.number().min(0).max(1).optional(),
});
export type RiskClassificationResult = z.infer<
  typeof riskClassificationResultSchema
>;

export const tenantMatchingRequestSchema = z.object({
  gridId: z.number().int(),
  businessCategory: z.string(),
  features: gridFeaturesSchema.partial().optional(),
});
export type TenantMatchingRequest = z.infer<typeof tenantMatchingRequestSchema>;

export const tenantMatchingResultSchema = z.object({
  gridId: z.number().int(),
  businessCategory: z.string(),
  matchScore: z.number().min(0).max(100),
});
export type TenantMatchingResult = z.infer<typeof tenantMatchingResultSchema>;
