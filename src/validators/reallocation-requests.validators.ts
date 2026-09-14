import { z } from "zod";

// Snapshot values (requested_district/distance_m/matching_score) are taken
// from what /api/reallocation showed the user at submission time -- the
// next titiktemu-analytics batch run can recompute reallocation_candidates
// with different numbers, so these aren't re-joined live later.
export const createReallocationRequestSchema = z.object({
  origin_grid_id: z.string().min(1),
  requested_grid_id: z.string().min(1),
  requested_district: z.string().max(200).optional(),
  distance_m: z.coerce.number().nonnegative().optional(),
  matching_score: z.coerce.number().optional(),
  note: z.string().max(1000).optional(),
});
export type CreateReallocationRequestBody = z.infer<
  typeof createReallocationRequestSchema
>;

export const reallocationRequestListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type ReallocationRequestListQuery = z.infer<
  typeof reallocationRequestListQuerySchema
>;

export const reallocationRequestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateReallocationRequestStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});
export type UpdateReallocationRequestStatusBody = z.infer<
  typeof updateReallocationRequestStatusSchema
>;
