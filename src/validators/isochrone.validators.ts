import { z } from "zod";

// Spec default: 0-800m / ~10 minutes walking (test.md's Network Analysis
// requirement).
export const isochroneQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  maxDistanceMeters: z.coerce.number().positive().max(2000).default(800),
});
export type IsochroneQuery = z.infer<typeof isochroneQuerySchema>;
