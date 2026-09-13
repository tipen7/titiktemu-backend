import { z } from "zod";

export const sentinel2GridQuerySchema = z.object({
  gridId: z.number().int(),
  bbox: z.object({
    minLng: z.number(),
    minLat: z.number(),
    maxLng: z.number(),
    maxLat: z.number(),
  }),
});
export type Sentinel2GridQuery = z.infer<typeof sentinel2GridQuerySchema>;

export const sentinel2NdbiResultSchema = z.object({
  gridId: z.number().int(),
  ndbiMean: z.number().min(-1).max(1),
  sceneId: z.string(),
  capturedAt: z.string(),
});
export type Sentinel2NdbiResult = z.infer<typeof sentinel2NdbiResultSchema>;
