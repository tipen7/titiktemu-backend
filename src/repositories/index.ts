import {
  type DatabaseStatus,
  getDatabaseStatus,
  getPool,
} from "../db/index.js";
import type {
  GeoJsonFeature,
  ReallocationCandidate,
  ZoneAtLocation,
} from "../types/analytics.js";
import type { AuthUser } from "../types/auth.js";

// Repositories isolate persistence queries from the service layer.
export async function readRepositoryStatus(): Promise<DatabaseStatus> {
  return getDatabaseStatus();
}

// The public.users row is created by the handle_new_user trigger (see
// supabase/migrations/004_auth_profiles.sql) the moment someone signs up
// via Supabase Auth -- this only ever reads it.
export async function readUserProfile(id: string): Promise<AuthUser | null> {
  const { rows } = await getPool().query<{
    id: string;
    email: string;
    role: AuthUser["role"];
    full_name: string | null;
  }>("SELECT id, email, role, full_name FROM users WHERE id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
  };
}

// The tables/view queried below (spatial_grids, gentrification_risk_scores,
// policy_recommendations, reallocation_candidates, spatial_grids_geojson)
// are written by titiktemu-analytics' batch pipeline (run_pipeline.py), not
// by this service -- see that repo's src/persistence/writer.py for the
// schema. This repository only reads them, via plain SQL, per the batch-vs-
// live architecture decision documented there: analytics precomputes once
// per run, the backend does a fast point-in-polygon / indexed lookup at
// request time, no Python call needed.

export async function readZonesGeoJson(): Promise<GeoJsonFeature[]> {
  const { rows } = await getPool().query<{ feature: GeoJsonFeature }>(
    "SELECT feature FROM spatial_grids_geojson",
  );
  return rows.map((row) => row.feature);
}

export async function readZoneAtLocation(
  lat: number,
  lng: number,
): Promise<ZoneAtLocation | null> {
  const { rows } = await getPool().query<ZoneAtLocation>(
    // NUMERIC columns cast to float8 -- node-postgres returns NUMERIC as a
    // string by default (to avoid silent precision loss), which doesn't
    // match this repo's typed API responses.
    `SELECT
       g.grid_id,
       g.district_name,
       r.ews_code,
       r.vulnerability_index::float8 AS vulnerability_index,
       r.matching_score::float8 AS matching_score,
       p.narrative,
       p.recommendation_type
     FROM spatial_grids g
     JOIN gentrification_risk_scores r ON r.grid_id = g.grid_id
     LEFT JOIN policy_recommendations p ON p.grid_id = g.grid_id
     WHERE ST_Contains(g.geom, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 32748))
     LIMIT 1`,
    [lng, lat],
  );
  return rows[0] ?? null;
}

export async function readLatestEwsModelAccuracy(): Promise<{
  accuracy_pct: number;
  n: number;
  ci_95_low_pct: number;
  ci_95_high_pct: number;
  confidence_level: "high" | "moderate" | "low";
  exact_match_accuracy_pct: number | null;
  opposite_extreme_error_pct: number | null;
  computed_at: string;
} | null> {
  // dashboard_summary is append-only (one row per batch run) and is
  // created lazily by analytics' write_dashboard_metrics(), not by this
  // service's ensure_schema-equivalent -- older rows (from before this
  // field existed, or from before the survey-validated metric replaced
  // the surface-fit-only figure) are filtered out with `metrics ? 'key'`
  // rather than read as a false 0% accuracy.
  //
  // accuracy_pct is ORDINAL/adjacent-tier-tolerant (aman/waspada/bahaya is
  // an ordered risk scale -- a one-tier miss, e.g. waspada predicted as
  // bahaya, counts as correct; a two-tier aman<->bahaya miss does not).
  // exact_match_accuracy_pct is the older, stricter figure, kept for
  // anyone auditing the model itself. Rows from before this distinction
  // existed won't have exact_match_accuracy_pct/opposite_extreme_error_pct
  // in their JSON -- ->> against a missing key is NULL, not an error, so
  // those two just come back null on old rows rather than breaking the query.
  const { rows } = await getPool().query<{
    accuracy_pct: number;
    n: number;
    ci_95_low_pct: number;
    ci_95_high_pct: number;
    confidence_level: "high" | "moderate" | "low";
    exact_match_accuracy_pct: number | null;
    opposite_extreme_error_pct: number | null;
    computed_at: string;
  }>(
    `SELECT
       (metrics->>'ews_validation_accuracy_pct')::float8 AS accuracy_pct,
       (metrics->>'ews_validation_n')::int AS n,
       (metrics->>'ews_validation_ci_95_low_pct')::float8 AS ci_95_low_pct,
       (metrics->>'ews_validation_ci_95_high_pct')::float8 AS ci_95_high_pct,
       metrics->>'confidence_level' AS confidence_level,
       (metrics->>'ews_validation_exact_match_accuracy_pct')::float8 AS exact_match_accuracy_pct,
       (metrics->>'ews_validation_opposite_extreme_error_pct')::float8 AS opposite_extreme_error_pct,
       computed_at
     FROM dashboard_summary
     WHERE metrics ? 'ews_validation_accuracy_pct'
     ORDER BY computed_at DESC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

// --- AI Chatbot retrieval -- reads the same tables the rest of this
// service already reads, no separate data path for the chatbot.

export async function readDashboardSummary(): Promise<Record<
  string,
  unknown
> | null> {
  const { rows } = await getPool().query<{
    metrics: Record<string, unknown>;
    computed_at: string;
  }>(
    "SELECT metrics, computed_at FROM dashboard_summary ORDER BY computed_at DESC LIMIT 1",
  );
  if (!rows[0]) return null;
  return { ...rows[0].metrics, computed_at: rows[0].computed_at };
}

export async function readKnownDistrictNames(): Promise<string[]> {
  const { rows } = await getPool().query<{ district_name: string }>(
    "SELECT DISTINCT district_name FROM spatial_grids WHERE district_name IS NOT NULL",
  );
  return rows.map((r) => r.district_name);
}

export interface DistrictSummary {
  district_name: string;
  total_cells: number;
  danger_count: number;
  moderate_count: number;
  safe_count: number;
  avg_vulnerability_index: number;
  avg_matching_score: number;
}

export async function readDistrictSummary(
  districtName: string,
): Promise<DistrictSummary | null> {
  const { rows } = await getPool().query<DistrictSummary>(
    `SELECT
       g.district_name,
       count(*)::int AS total_cells,
       count(*) FILTER (WHERE r.ews_code = 2)::int AS danger_count,
       count(*) FILTER (WHERE r.ews_code = 1)::int AS moderate_count,
       count(*) FILTER (WHERE r.ews_code = 0)::int AS safe_count,
       avg(r.vulnerability_index)::float8 AS avg_vulnerability_index,
       avg(r.matching_score)::float8 AS avg_matching_score
     FROM spatial_grids g
     JOIN gentrification_risk_scores r ON r.grid_id = g.grid_id
     WHERE g.district_name = $1
     GROUP BY g.district_name`,
    [districtName],
  );
  return rows[0] ?? null;
}

export interface GridDetail {
  grid_id: string;
  district_name: string | null;
  kecamatan: string | null;
  ews_code: number;
  vulnerability_index: number;
  matching_score: number;
  narrative: string | null;
  recommendation_type: string | null;
}

export async function readGridDetail(
  gridId: string,
): Promise<GridDetail | null> {
  const { rows } = await getPool().query<GridDetail>(
    `SELECT
       g.grid_id, g.district_name, g.kecamatan,
       r.ews_code, r.vulnerability_index::float8 AS vulnerability_index,
       r.matching_score::float8 AS matching_score,
       p.narrative, p.recommendation_type
     FROM spatial_grids g
     JOIN gentrification_risk_scores r ON r.grid_id = g.grid_id
     LEFT JOIN policy_recommendations p ON p.grid_id = g.grid_id
     WHERE g.grid_id = $1`,
    [gridId],
  );
  return rows[0] ?? null;
}

// --- Individual UMKM business records -- see titiktemu-analytics'
// src/persistence/writer.py umkm_businesses schema note for provenance
// (real survey rows, no fabricated fields).

export interface UmkmBusiness {
  id: string;
  name: string | null;
  category: string | null;
  grid_id: string;
  district_name: string | null;
  kecamatan: string | null;
  latitude: number;
  longitude: number;
  dist_to_station_m: number | null;
  reference_price_per_txn_idr: number | null;
  data_confidence: number | null;
  source: string;
  ews_code: number | null;
  vulnerability_index: number | null;
  matching_score: number | null;
}

export interface UmkmListFilters {
  districtName?: string;
  search?: string;
  ewsCode?: number;
  limit?: number;
  offset?: number;
}

export async function readUmkmList(
  filters: UmkmListFilters,
): Promise<{ rows: UmkmBusiness[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.districtName) {
    params.push(filters.districtName);
    conditions.push(`b.district_name = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`b.name ILIKE $${params.length}`);
  }
  if (filters.ewsCode !== undefined) {
    params.push(filters.ewsCode);
    conditions.push(`r.ews_code = $${params.length}`);
  }
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const { rows: countRows } = await getPool().query<{ count: string }>(
    `SELECT count(*) FROM umkm_businesses b
     LEFT JOIN gentrification_risk_scores r ON r.grid_id = b.grid_id
     ${whereClause}`,
    params,
  );

  const { rows } = await getPool().query<UmkmBusiness>(
    `SELECT
       b.id, b.name, b.category, b.grid_id, b.district_name, b.kecamatan,
       b.latitude::float8 AS latitude, b.longitude::float8 AS longitude,
       b.dist_to_station_m::float8 AS dist_to_station_m,
       b.reference_price_per_txn_idr::float8 AS reference_price_per_txn_idr,
       b.data_confidence::float8 AS data_confidence, b.source,
       r.ews_code, r.vulnerability_index::float8 AS vulnerability_index,
       r.matching_score::float8 AS matching_score
     FROM umkm_businesses b
     LEFT JOIN gentrification_risk_scores r ON r.grid_id = b.grid_id
     ${whereClause}
     ORDER BY b.name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function readUmkmById(id: string): Promise<UmkmBusiness | null> {
  const { rows } = await getPool().query<UmkmBusiness>(
    `SELECT
       b.id, b.name, b.category, b.grid_id, b.district_name, b.kecamatan,
       b.latitude::float8 AS latitude, b.longitude::float8 AS longitude,
       b.dist_to_station_m::float8 AS dist_to_station_m,
       b.reference_price_per_txn_idr::float8 AS reference_price_per_txn_idr,
       b.data_confidence::float8 AS data_confidence, b.source,
       r.ews_code, r.vulnerability_index::float8 AS vulnerability_index,
       r.matching_score::float8 AS matching_score
     FROM umkm_businesses b
     LEFT JOIN gentrification_risk_scores r ON r.grid_id = b.grid_id
     WHERE b.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface PolicyRecommendation {
  grid_id: string;
  district_name: string | null;
  narrative: string;
  recommendation_type: string;
  vulnerability_index: number;
  generated_at: string;
}

export async function readPolicyRecommendations(
  recommendationType?: string,
): Promise<PolicyRecommendation[]> {
  const conditions = ["p.narrative IS NOT NULL"];
  const params: unknown[] = [];
  if (recommendationType) {
    params.push(recommendationType);
    conditions.push(`p.recommendation_type = $${params.length}`);
  }
  const { rows } = await getPool().query<PolicyRecommendation>(
    `SELECT
       p.grid_id, g.district_name, p.narrative, p.recommendation_type,
       r.vulnerability_index::float8 AS vulnerability_index, p.generated_at
     FROM policy_recommendations p
     JOIN spatial_grids g ON g.grid_id = p.grid_id
     JOIN gentrification_risk_scores r ON r.grid_id = p.grid_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.generated_at DESC`,
    params,
  );
  return rows;
}

export async function readReallocationCandidates(
  originGridId: string,
): Promise<ReallocationCandidate[]> {
  const { rows } = await getPool().query<ReallocationCandidate>(
    `SELECT
       rc.rank,
       rc.recommended_grid_id,
       rc.recommended_district,
       rc.distance_m::float8 AS distance_m,
       rc.matching_score::float8 AS matching_score,
       rc.crossed_district,
       g.feature AS recommended_feature
     FROM reallocation_candidates rc
     JOIN spatial_grids_geojson g ON g.grid_id = rc.recommended_grid_id
     WHERE rc.origin_grid_id = $1
     ORDER BY rc.rank`,
    [originGridId],
  );
  return rows;
}

// --- UMKM self-report submissions (supabase/migrations/005_umkm_self_reports.sql)
// -- a UMKM user's own survey data, held here for an analyst to later fold
// into titiktemu-analytics' real survey CSV. Not read by this app's own
// map/dashboard endpoints -- purely a submission + operator-review resource.

export interface UmkmSelfReport {
  id: string;
  submitted_by: string | null;
  business_name: string;
  description: string | null;
  category: string | null;
  tenant_type: string | null;
  latitude: number;
  longitude: number;
  tenant_area_m2: number | null;
  target_market: string | null;
  rent_price_amount: number | null;
  rent_period_unit: string | null;
  rent_expiry_date: string | null;
  revenue_per_month_idr: number | null;
  txn_high_idr: number | null;
  txn_normal_idr: number | null;
  txn_low_idr: number | null;
  transaction_per_buyer_idr: number | null;
  rent_trend_pct: number | null;
  status: "pending" | "reviewed" | "exported";
  created_at: string;
  updated_at: string;
}

export interface CreateUmkmSelfReportInput {
  submittedBy: string | null;
  businessName: string;
  latitude: number;
  longitude: number;
  description?: string;
  category?: string;
  tenantType?: string;
  tenantAreaM2?: number;
  targetMarket?: string;
  rentPriceAmount?: number;
  rentPeriodUnit?: string;
  rentExpiryDate?: string;
  revenuePerMonthIdr?: number;
  txnHighIdr?: number;
  txnNormalIdr?: number;
  txnLowIdr?: number;
  transactionPerBuyerIdr?: number;
  rentTrendPct?: number;
}

const UMKM_SELF_REPORT_RETURNING = `
  id, submitted_by, business_name, description, category, tenant_type,
  latitude::float8 AS latitude, longitude::float8 AS longitude,
  tenant_area_m2::float8 AS tenant_area_m2, target_market,
  rent_price_amount::float8 AS rent_price_amount, rent_period_unit, rent_expiry_date,
  revenue_per_month_idr::float8 AS revenue_per_month_idr,
  txn_high_idr::float8 AS txn_high_idr, txn_normal_idr::float8 AS txn_normal_idr,
  txn_low_idr::float8 AS txn_low_idr,
  transaction_per_buyer_idr::float8 AS transaction_per_buyer_idr,
  rent_trend_pct::float8 AS rent_trend_pct, status, created_at, updated_at`;

export async function insertUmkmSelfReport(
  input: CreateUmkmSelfReportInput,
): Promise<UmkmSelfReport> {
  const { rows } = await getPool().query<UmkmSelfReport>(
    `INSERT INTO umkm_self_reports (
       submitted_by, business_name, description, category, tenant_type, latitude, longitude,
       tenant_area_m2, target_market, rent_price_amount, rent_period_unit, rent_expiry_date,
       revenue_per_month_idr, txn_high_idr, txn_normal_idr, txn_low_idr,
       transaction_per_buyer_idr, rent_trend_pct
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING ${UMKM_SELF_REPORT_RETURNING}`,
    [
      input.submittedBy,
      input.businessName,
      input.description ?? null,
      input.category ?? null,
      input.tenantType ?? null,
      input.latitude,
      input.longitude,
      input.tenantAreaM2 ?? null,
      input.targetMarket ?? null,
      input.rentPriceAmount ?? null,
      input.rentPeriodUnit ?? null,
      input.rentExpiryDate ?? null,
      input.revenuePerMonthIdr ?? null,
      input.txnHighIdr ?? null,
      input.txnNormalIdr ?? null,
      input.txnLowIdr ?? null,
      input.transactionPerBuyerIdr ?? null,
      input.rentTrendPct ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to insert umkm_self_reports row");
  return row;
}

export interface UmkmSelfReportListFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function readUmkmSelfReports(
  filters: UmkmSelfReportListFilters,
): Promise<{ rows: UmkmSelfReport[]; total: number }> {
  const params: unknown[] = [];
  let whereClause = "";
  if (filters.status) {
    params.push(filters.status);
    whereClause = `WHERE status = $${params.length}`;
  }

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const { rows: countRows } = await getPool().query<{ count: string }>(
    `SELECT count(*) FROM umkm_self_reports ${whereClause}`,
    params,
  );

  const { rows } = await getPool().query<UmkmSelfReport>(
    `SELECT ${UMKM_SELF_REPORT_RETURNING}
     FROM umkm_self_reports
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

// --- Reallocation requests (supabase/migrations/006_reallocation_requests.sql)
// -- a UMKM user's request to relocate to one specific reallocation
// candidate; surfaced for operator approval/rejection. Deliberately a
// separate resource/name from "Laporan Alokasi" (policy_recommendations
// above), which is a read-only AI-narrative feature unrelated to this one.

export interface ReallocationRequest {
  id: string;
  submitted_by: string | null;
  origin_grid_id: string;
  requested_grid_id: string;
  requested_district: string | null;
  distance_m: number | null;
  matching_score: number | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReallocationRequestInput {
  submittedBy: string | null;
  originGridId: string;
  requestedGridId: string;
  requestedDistrict?: string;
  distanceM?: number;
  matchingScore?: number;
  note?: string;
}

const REALLOCATION_REQUEST_RETURNING = `
  id, submitted_by, origin_grid_id, requested_grid_id, requested_district,
  distance_m::float8 AS distance_m, matching_score::float8 AS matching_score,
  note, status, reviewed_by, reviewed_at, created_at, updated_at`;

export async function insertReallocationRequest(
  input: CreateReallocationRequestInput,
): Promise<ReallocationRequest> {
  const { rows } = await getPool().query<ReallocationRequest>(
    `INSERT INTO reallocation_requests (
       submitted_by, origin_grid_id, requested_grid_id, requested_district,
       distance_m, matching_score, note
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING ${REALLOCATION_REQUEST_RETURNING}`,
    [
      input.submittedBy,
      input.originGridId,
      input.requestedGridId,
      input.requestedDistrict ?? null,
      input.distanceM ?? null,
      input.matchingScore ?? null,
      input.note ?? null,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error("Failed to insert reallocation_requests row");
  return row;
}

export interface ReallocationRequestListFilters {
  status?: string;
  limit?: number;
  offset?: number;
}

export async function readReallocationRequests(
  filters: ReallocationRequestListFilters,
): Promise<{ rows: ReallocationRequest[]; total: number }> {
  const params: unknown[] = [];
  let whereClause = "";
  if (filters.status) {
    params.push(filters.status);
    whereClause = `WHERE status = $${params.length}`;
  }

  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const { rows: countRows } = await getPool().query<{ count: string }>(
    `SELECT count(*) FROM reallocation_requests ${whereClause}`,
    params,
  );

  const { rows } = await getPool().query<ReallocationRequest>(
    `SELECT ${REALLOCATION_REQUEST_RETURNING}
     FROM reallocation_requests
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return { rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function updateReallocationRequestStatus(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string | null,
): Promise<ReallocationRequest | null> {
  const { rows } = await getPool().query<ReallocationRequest>(
    `UPDATE reallocation_requests
     SET status = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING ${REALLOCATION_REQUEST_RETURNING}`,
    [id, status, reviewedBy],
  );
  return rows[0] ?? null;
}
