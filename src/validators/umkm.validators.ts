import { z } from "zod";

export const umkmListQuerySchema = z.object({
  district: z.string().optional(),
  search: z.string().optional(),
  ews_code: z.coerce.number().int().min(0).max(2).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type UmkmListQuery = z.infer<typeof umkmListQuerySchema>;

export const umkmIdParamSchema = z.object({ id: z.string().min(1) });

export const policyRecommendationsQuerySchema = z.object({
  recommendation_type: z.enum(["mitigasi", "realokasi", "pemantauan"]).optional(),
});
