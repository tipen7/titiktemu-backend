import { z } from "zod";

// Study area bbox from titiktemu-analytics' src/config.py -- generous pad so
// a point just outside the grid still reaches the "outside study area"
// response instead of a validation error.
export const locationQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
export type LocationQuery = z.infer<typeof locationQuerySchema>;
