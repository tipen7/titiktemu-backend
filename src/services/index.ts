import {
  type CreateReallocationRequestInput,
  type CreateUmkmSelfReportInput,
  insertReallocationRequest,
  insertUmkmSelfReport,
  type ReallocationRequestListFilters,
  readDashboardSummary,
  readLatestEwsModelAccuracy,
  readPolicyRecommendations,
  readReallocationCandidates,
  readReallocationRequests,
  readRepositoryStatus,
  readUmkmById,
  readUmkmList,
  readUmkmSelfReports,
  readUserProfile,
  readZoneAtLocation,
  readZonesGeoJson,
  type UmkmListFilters,
  type UmkmSelfReportListFilters,
  updateReallocationRequestStatus,
} from "../repositories/index.js";
import type {
  GeoJsonFeature,
  ModelAccuracy,
  ZoneAtLocation,
} from "../types/analytics.js";
import type { AuthUser } from "../types/auth.js";

// Services contain application and domain rules between controllers and repositories.
export interface ServiceStatus {
  status: "ok" | "degraded";
  database: "ok" | "error";
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const database = await readRepositoryStatus();
  return { status: database === "ok" ? "ok" : "degraded", database };
}

// EWS code -> zone color, mirrors titiktemu-analytics'
// src/modeling/zones.py EWS_TO_COLOR -- single source of truth for the
// mapping lives there; kept in sync here since this service doesn't run
// Python. 0 = aman/green, 1 = waspada/yellow, 2 = bahaya/red.
export const EWS_TO_COLOR = ["green", "yellow", "red"] as const;
export const EWS_TO_LABEL = ["aman", "waspada", "bahaya"] as const;

export interface ZoneDetail extends ZoneAtLocation {
  zone_color: (typeof EWS_TO_COLOR)[number];
  zone_label: (typeof EWS_TO_LABEL)[number];
  model_accuracy: ModelAccuracy | null;
}

export async function getZonesGeoJson(): Promise<{
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}> {
  const features = await readZonesGeoJson();
  return { type: "FeatureCollection", features };
}

export async function getModelAccuracy(): Promise<ModelAccuracy | null> {
  // Decorative/supplementary data -- a missing dashboard_summary table (a
  // fresh DB the analytics batch hasn't run against yet) shouldn't break
  // the actual zone lookup, so this fails soft to null rather than
  // propagating to the errorHandler's 500.
  try {
    const row = await readLatestEwsModelAccuracy();
    if (!row) return null;
    // confidence_level comes straight from analytics' own computation
    // (derived from the real validation sample size `n`, see that repo's
    // src/modeling/xgboost_ews.validate_ews_against_survey) -- it is NOT
    // re-derived from accuracy_pct here. Deriving confidence from the
    // accuracy number itself was the old bug: it mechanically labeled a
    // high (but statistically meaningless) percentage "high confidence"
    // regardless of how many real points backed it.
    return {
      accuracy_pct: row.accuracy_pct,
      n: row.n,
      ci_95_low_pct: row.ci_95_low_pct,
      ci_95_high_pct: row.ci_95_high_pct,
      confidence_level: row.confidence_level,
      computed_at: row.computed_at,
    };
  } catch {
    return null;
  }
}

export async function getZoneAtLocation(
  lat: number,
  lng: number,
): Promise<ZoneDetail | null> {
  const zone = await readZoneAtLocation(lat, lng);
  if (!zone) return null;
  const modelAccuracy = await getModelAccuracy();
  return {
    ...zone,
    zone_color: EWS_TO_COLOR[zone.ews_code] ?? "green",
    zone_label: EWS_TO_LABEL[zone.ews_code] ?? "aman",
    model_accuracy: modelAccuracy,
  };
}

export interface ReallocationResult {
  found: boolean;
  eligible: boolean;
  zone: ZoneDetail | null;
  candidates: Awaited<ReturnType<typeof readReallocationCandidates>>;
  message?: string;
}

export async function getReallocationForLocation(
  lat: number,
  lng: number,
): Promise<ReallocationResult> {
  const zone = await getZoneAtLocation(lat, lng);
  if (!zone) {
    return { found: false, eligible: false, zone: null, candidates: [] };
  }

  // Matches the "medium/high gentrification -> can request reallocation"
  // product requirement, EXCEPT: titiktemu-analytics' batch pipeline
  // (precompute_reallocations()) only precomputes candidates for "bahaya"
  // (ews_code 2) cells today, not "waspada" (1) -- see that repo's
  // src/modeling/zones.py. Rather than fabricate a recommendation for
  // waspada zones with no precomputed data behind it, this is surfaced
  // honestly instead of silently returning an empty list that looks the
  // same as "no data yet".
  if (zone.ews_code !== 2) {
    return {
      found: true,
      eligible: zone.ews_code === 1,
      zone,
      candidates: [],
      message:
        zone.ews_code === 1
          ? "This zone is waspada (medium risk), but the analytics batch pipeline only precomputes reallocation candidates for bahaya (high risk) zones today."
          : "This zone is aman (safe) -- no reallocation needed.",
    };
  }

  const candidates = await readReallocationCandidates(zone.grid_id);
  return { found: true, eligible: true, zone, candidates };
}

// --- UMKM business listing (Discovery Map favorites, UMKM Self-Tracker) ---

function attachZoneLabel<T extends { ews_code: number | null }>(
  row: T,
): T & {
  zone_color: (typeof EWS_TO_COLOR)[number] | null;
  zone_label: (typeof EWS_TO_LABEL)[number] | null;
} {
  return {
    ...row,
    zone_color:
      row.ews_code !== null ? (EWS_TO_COLOR[row.ews_code] ?? null) : null,
    zone_label:
      row.ews_code !== null ? (EWS_TO_LABEL[row.ews_code] ?? null) : null,
  };
}

export async function getUmkmList(filters: UmkmListFilters) {
  const { rows, total } = await readUmkmList(filters);
  return { rows: rows.map(attachZoneLabel), total };
}

export async function getUmkmById(id: string) {
  const row = await readUmkmById(id);
  return row ? attachZoneLabel(row) : null;
}

// --- Dashboard summary (ESG Dashboard, Operator beranda "Panel Informasi") ---

export async function getDashboardSummary() {
  return readDashboardSummary();
}

// --- Policy recommendations (Laporan Alokasi) ---

export async function getPolicyRecommendations(recommendationType?: string) {
  return readPolicyRecommendations(recommendationType);
}

// --- Auth ---

export async function getUserProfile(id: string): Promise<AuthUser | null> {
  return readUserProfile(id);
}

// --- UMKM self-report submissions ---

export async function submitUmkmSelfReport(input: CreateUmkmSelfReportInput) {
  return insertUmkmSelfReport(input);
}

export async function getUmkmSelfReports(filters: UmkmSelfReportListFilters) {
  return readUmkmSelfReports(filters);
}

// --- Reallocation requests ("Pengajuan Realokasi") -- distinct from Laporan
// Alokasi (policy_recommendations) above; see repository module docstring. ---

export async function submitReallocationRequest(
  input: CreateReallocationRequestInput,
) {
  return insertReallocationRequest(input);
}

export async function getReallocationRequests(
  filters: ReallocationRequestListFilters,
) {
  return readReallocationRequests(filters);
}

export async function decideReallocationRequest(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string | null,
) {
  return updateReallocationRequestStatus(id, status, reviewedBy);
}
