import { z } from "zod";

export const osmBoundingBoxSchema = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});
export type OsmBoundingBox = z.infer<typeof osmBoundingBoxSchema>;

const osmLocationSchema = z.object({ lat: z.number(), lng: z.number() });

export const osmRoadSchema = z.object({
  osmId: z.number().int(),
  roadType: z.string(),
  name: z.string().optional(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
  }),
});
export type OsmRoad = z.infer<typeof osmRoadSchema>;

export const osmPoiSchema = z.object({
  osmId: z.number().int(),
  poiType: z.string(),
  name: z.string().optional(),
  tags: z.record(z.string(), z.string()),
  location: osmLocationSchema,
});
export type OsmPoi = z.infer<typeof osmPoiSchema>;
