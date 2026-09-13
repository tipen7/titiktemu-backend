import type { RequestHandler } from "express";
import { getChatResponse } from "../services/chat/index.js";
import {
  getDashboardSummary,
  getModelAccuracy,
  getPolicyRecommendations,
  getReallocationForLocation,
  getServiceStatus,
  getUmkmById,
  getUmkmList,
  getZoneAtLocation,
  getZonesGeoJson,
} from "../services/index.js";
import { chatRequestSchema } from "../validators/chat.validators.js";
import {
  policyRecommendationsQuerySchema,
  umkmIdParamSchema,
  umkmListQuerySchema,
} from "../validators/umkm.validators.js";
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
