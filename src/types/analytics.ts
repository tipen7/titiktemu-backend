// Shapes read from titiktemu-analytics' output tables (see
// src/repositories/index.ts for the queries). Kept separate from
// src/validators/ since these describe data coming OUT of the database,
// not untrusted request input.

export interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: {
    grid_id: string;
    district_name: string | null;
    kecamatan: string | null;
    poi_count: number | null;
    ews_code: number | null;
    vulnerability_index: number | null;
    matching_score: number | null;
  };
}

export interface ZoneAtLocation {
  grid_id: string;
  district_name: string | null;
  ews_code: number;
  vulnerability_index: number;
  matching_score: number;
  narrative: string | null;
  recommendation_type: string | null;
}

// The GENUINE, real-ground-truth accuracy figure for the LATEST batch run
// (titiktemu-analytics writes this into
// dashboard_summary.metrics.ews_validation_accuracy_pct -- see that repo's
// src/modeling/xgboost_ews.validate_ews_against_survey and
// src/persistence/dashboard_metrics.py). This is a leave-one-out
// cross-validated check against REAL, measured UMKM survey vulnerability,
// NOT the XGBoost/GWR surface-fit figure (dashboard_summary.metrics.
// xgboost_surface_fit_pct, near-100% by construction and intentionally
// NOT exposed here -- see that field's own docstring for why it would be
// misleading as "model accuracy").
//
// `confidence_level` is read directly from analytics' own computation
// (derived from `n`, the real validation sample size) -- do NOT re-derive
// it from `accuracy_pct` here. That was the old bug: a high accuracy
// number was mechanically labeled "high confidence" regardless of how
// many real points backed it, compounding an already-inflated figure.
export interface ModelAccuracy {
  accuracy_pct: number;
  n: number;
  ci_95_low_pct: number;
  ci_95_high_pct: number;
  confidence_level: "high" | "moderate" | "low";
  computed_at: string;
}

export interface ReallocationCandidate {
  rank: number;
  recommended_grid_id: string;
  recommended_district: string | null;
  distance_m: number;
  matching_score: number;
  crossed_district: boolean;
  recommended_feature: GeoJsonFeature;
}
