import { z } from "zod";

export const mapidLocationQuerySchema = z.object({
  bbox: z
    .object({
      minLng: z.number(),
      minLat: z.number(),
      maxLng: z.number(),
      maxLat: z.number(),
    })
    .optional(),
  gridId: z.number().int().optional(),
  limit: z.number().int().positive().max(500).optional(),
});
export type MapidLocationQuery = z.infer<typeof mapidLocationQuerySchema>;

const mapidLocationSchema = z.object({ lat: z.number(), lng: z.number() });

export const mapidStrukGoRecordSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  category: z.string(),
  transactionCount: z.number().int().nonnegative(),
  averageTransactionValue: z.number().nonnegative(),
  location: mapidLocationSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
});
export type MapidStrukGoRecord = z.infer<typeof mapidStrukGoRecordSchema>;

export const mapidMenuGoRecordSchema = z.object({
  id: z.string(),
  merchantName: z.string(),
  menuCategory: z.string(),
  averagePrice: z.number().nonnegative(),
  location: mapidLocationSchema,
});
export type MapidMenuGoRecord = z.infer<typeof mapidMenuGoRecordSchema>;

export const mapidPropertiGoRecordSchema = z.object({
  id: z.string(),
  propertyType: z.enum(["residential", "commercial", "land"]),
  listingPrice: z.number().nonnegative(),
  areaSqm: z.number().positive(),
  location: mapidLocationSchema,
  listedAt: z.string(),
});
export type MapidPropertiGoRecord = z.infer<typeof mapidPropertiGoRecordSchema>;
