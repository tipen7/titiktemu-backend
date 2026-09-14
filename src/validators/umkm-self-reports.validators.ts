import { z } from "zod";

// Mirrors the real survey fields titiktemu-analytics' batch pipeline
// ingests (src/ingestion/umkm_survey.py) -- only business_name and a real
// lat/lng are required; everything else stays optional, matching that
// pipeline's honest-partial-data philosophy (data_completeness_score is
// computed there, not assumed complete here).
export const createUmkmSelfReportSchema = z.object({
  business_name: z.string().min(1).max(200),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  description: z.string().max(2000).optional(),
  tenant_type: z
    .enum([
      "umkm_tetap",
      "umkm_seasonal",
      "franchise_tetap",
      "franchise_seasonal",
    ])
    .optional(),
  tenant_area_m2: z.coerce.number().positive().optional(),
  target_market: z.string().max(200).optional(),
  // Matches the survey's actual "amount/period" convention, e.g. "13 juta/bulan".
  rent_price_amount: z.coerce.number().nonnegative().optional(),
  rent_period_unit: z.enum(["hari", "bulan", "tahun"]).optional(),
  rent_expiry_date: z.iso.date().optional(),
  revenue_per_month_idr: z.coerce.number().nonnegative().optional(),
  txn_high_idr: z.coerce.number().nonnegative().optional(),
  txn_normal_idr: z.coerce.number().nonnegative().optional(),
  txn_low_idr: z.coerce.number().nonnegative().optional(),
  transaction_per_buyer_idr: z.coerce.number().nonnegative().optional(),
  rent_trend_pct: z.coerce.number().optional(),
});
export type CreateUmkmSelfReportBody = z.infer<
  typeof createUmkmSelfReportSchema
>;

export const umkmSelfReportListQuerySchema = z.object({
  status: z.enum(["pending", "reviewed", "exported"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type UmkmSelfReportListQuery = z.infer<
  typeof umkmSelfReportListQuerySchema
>;
