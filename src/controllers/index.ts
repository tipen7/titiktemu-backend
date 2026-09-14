import type { RequestHandler } from "express";
import { getChatResponse } from "../services/chat/index.js";
import {
  decideReallocationRequest,
  getDashboardSummary,
  getModelAccuracy,
  getPolicyRecommendations,
  getReallocationForLocation,
  getReallocationRequests,
  getServiceStatus,
  getUmkmById,
  getUmkmList,
  getUmkmSelfReports,
  getZoneAtLocation,
  getZonesGeoJson,
  submitReallocationRequest,
  submitUmkmSelfReport,
} from "../services/index.js";
import { chatRequestSchema } from "../validators/chat.validators.js";
import {
  createReallocationRequestSchema,
  reallocationRequestIdParamSchema,
  reallocationRequestListQuerySchema,
  updateReallocationRequestStatusSchema,
} from "../validators/reallocation-requests.validators.js";
import {
  policyRecommendationsQuerySchema,
  umkmIdParamSchema,
  umkmListQuerySchema,
} from "../validators/umkm.validators.js";
import {
  createUmkmSelfReportSchema,
  umkmSelfReportListQuerySchema,
} from "../validators/umkm-self-reports.validators.js";
import { locationQuerySchema } from "../validators/zones.validators.js";

// Controllers translate HTTP requests into service calls and HTTP responses.
export const healthController: RequestHandler = (_request, response) => {
  response.json({ status: "ok" });
};

export const statusController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const result = await getServiceStatus();
    response.status(result.status === "ok" ? 200 : 503).json(result);
  } catch (error) {
    next(error);
  }
};

// Powers the Discovery Map's base layer: every grid cell, colored by EWS
// zone, as GeoJSON ready for a Leaflet <GeoJSON> layer.
export const zonesController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const geojson = await getZonesGeoJson();
    response.json(geojson);
  } catch (error) {
    next(error);
  }
};

// Powers the UMKM Self Discovery Tracker: given a UMKM's own location,
// which zone are they in and what does it mean.
export const zoneLookupController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { lat, lng } = locationQuerySchema.parse(request.query);
    const zone = await getZoneAtLocation(lat, lng);
    if (!zone) {
      response
        .status(404)
        .json({ error: "Location is outside the study area" });
      return;
    }
    response.json(zone);
  } catch (error) {
    next(error);
  }
};

// Powers the confidence badge shown alongside every prediction (zone
// tiles, zone lookup, reallocation) -- one number per batch run, fetched
// once by the frontend and reused everywhere rather than repeated on
// every one of the ~390 grid cell features in /api/zones.
export const modelAccuracyController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const accuracy = await getModelAccuracy();
    if (!accuracy) {
      response.status(404).json({
        error:
          "No model accuracy recorded yet -- run the analytics batch pipeline first",
      });
      return;
    }
    response.json(accuracy);
  } catch (error) {
    next(error);
  }
};

// Powers the Smart Tenant Matching Engine's "View Reallocation" button.
export const reallocationController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { lat, lng } = locationQuerySchema.parse(request.query);
    const result = await getReallocationForLocation(lat, lng);
    if (!result.found) {
      response
        .status(404)
        .json({ error: "Location is outside the study area" });
      return;
    }
    response.json(result);
  } catch (error) {
    next(error);
  }
};

// Powers the Asisten AI TitikTemu chatbot -- both Operator and UMKM user
// surfaces, scoped to this site's domain only (see services/chat/index.ts).
export const chatController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { message, role, history } = chatRequestSchema.parse(request.body);
    const result = await getChatResponse(message, role, history);
    response.json(result);
  } catch (error) {
    next(error);
  }
};

// Powers Discovery Map's favorites list and UMKM Self-Tracker's table.
export const umkmListController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const query = umkmListQuerySchema.parse(request.query);
    const result = await getUmkmList({
      ...(query.district !== undefined && { districtName: query.district }),
      ...(query.search !== undefined && { search: query.search }),
      ...(query.ews_code !== undefined && { ewsCode: query.ews_code }),
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.offset !== undefined && { offset: query.offset }),
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
};

export const umkmDetailController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = umkmIdParamSchema.parse(request.params);
    const business = await getUmkmById(id);
    if (!business) {
      response.status(404).json({ error: "UMKM not found" });
      return;
    }
    response.json(business);
  } catch (error) {
    next(error);
  }
};

// Powers ESG Dashboard and the Operator beranda's "Panel Informasi".
export const dashboardSummaryController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    const summary = await getDashboardSummary();
    if (!summary) {
      response.status(404).json({ error: "No dashboard summary recorded yet" });
      return;
    }
    response.json(summary);
  } catch (error) {
    next(error);
  }
};

// Powers the account footer/role-aware UI in the sidebar -- requireAuth
// (see src/middleware/index.ts) guarantees request.user is set here.
export const meController: RequestHandler = (request, response) => {
  response.json(request.user);
};

// Powers Laporan Alokasi.
export const policyRecommendationsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { recommendation_type } = policyRecommendationsQuerySchema.parse(
      request.query,
    );
    const recommendations = await getPolicyRecommendations(recommendation_type);
    response.json(recommendations);
  } catch (error) {
    next(error);
  }
};

// --- UMKM self-report submissions ---

// A UMKM user submits their own business survey data (rent, revenue,
// tenant info) for a future titiktemu-analytics batch survey import.
// requireAuth + requireRole("umkm") (see routes) guarantee request.user.
export const createUmkmSelfReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const body = createUmkmSelfReportSchema.parse(request.body);
    const report = await submitUmkmSelfReport({
      submittedBy: request.user?.id ?? null,
      businessName: body.business_name,
      latitude: body.latitude,
      longitude: body.longitude,
      ...(body.description !== undefined && { description: body.description }),
      ...(body.tenant_type !== undefined && { tenantType: body.tenant_type }),
      ...(body.tenant_area_m2 !== undefined && {
        tenantAreaM2: body.tenant_area_m2,
      }),
      ...(body.target_market !== undefined && {
        targetMarket: body.target_market,
      }),
      ...(body.rent_price_amount !== undefined && {
        rentPriceAmount: body.rent_price_amount,
      }),
      ...(body.rent_period_unit !== undefined && {
        rentPeriodUnit: body.rent_period_unit,
      }),
      ...(body.rent_expiry_date !== undefined && {
        rentExpiryDate: body.rent_expiry_date,
      }),
      ...(body.revenue_per_month_idr !== undefined && {
        revenuePerMonthIdr: body.revenue_per_month_idr,
      }),
      ...(body.txn_high_idr !== undefined && { txnHighIdr: body.txn_high_idr }),
      ...(body.txn_normal_idr !== undefined && {
        txnNormalIdr: body.txn_normal_idr,
      }),
      ...(body.txn_low_idr !== undefined && { txnLowIdr: body.txn_low_idr }),
      ...(body.transaction_per_buyer_idr !== undefined && {
        transactionPerBuyerIdr: body.transaction_per_buyer_idr,
      }),
      ...(body.rent_trend_pct !== undefined && {
        rentTrendPct: body.rent_trend_pct,
      }),
    });
    response.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

// Powers an operator review screen for pending self-reports.
export const listUmkmSelfReportsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const query = umkmSelfReportListQuerySchema.parse(request.query);
    const result = await getUmkmSelfReports({
      ...(query.status !== undefined && { status: query.status }),
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.offset !== undefined && { offset: query.offset }),
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
};

// --- Reallocation requests ("Pengajuan Realokasi") ---

// A UMKM user picks one reallocation candidate (from GET /api/reallocation)
// and requests relocating there; surfaced for operator review below.
export const createReallocationRequestController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const body = createReallocationRequestSchema.parse(request.body);
    const created = await submitReallocationRequest({
      submittedBy: request.user?.id ?? null,
      originGridId: body.origin_grid_id,
      requestedGridId: body.requested_grid_id,
      ...(body.requested_district !== undefined && {
        requestedDistrict: body.requested_district,
      }),
      ...(body.distance_m !== undefined && { distanceM: body.distance_m }),
      ...(body.matching_score !== undefined && {
        matchingScore: body.matching_score,
      }),
      ...(body.note !== undefined && { note: body.note }),
    });
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const listReallocationRequestsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const query = reallocationRequestListQuerySchema.parse(request.query);
    const result = await getReallocationRequests({
      ...(query.status !== undefined && { status: query.status }),
      ...(query.limit !== undefined && { limit: query.limit }),
      ...(query.offset !== undefined && { offset: query.offset }),
    });
    response.json(result);
  } catch (error) {
    next(error);
  }
};

// Operator approves/rejects a pending reallocation request.
export const decideReallocationRequestController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = reallocationRequestIdParamSchema.parse(request.params);
    const { status } = updateReallocationRequestStatusSchema.parse(
      request.body,
    );
    const updated = await decideReallocationRequest(
      id,
      status,
      request.user?.id ?? null,
    );
    if (!updated) {
      response.status(404).json({ error: "Reallocation request not found" });
      return;
    }
    response.json(updated);
  } catch (error) {
    next(error);
  }
};
