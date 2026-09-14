import { type Router as ExpressRouter, Router } from "express";
import {
  chatController,
  createReallocationRequestController,
  createUmkmSelfReportController,
  dashboardSummaryController,
  decideReallocationRequestController,
  healthController,
  listReallocationRequestsController,
  listUmkmSelfReportsController,
  meController,
  modelAccuracyController,
  policyRecommendationsController,
  reallocationController,
  statusController,
  umkmDetailController,
  umkmListController,
  zoneLookupController,
  zonesController,
} from "../controllers/index.js";
import { requireAuth, requireRole } from "../middleware/index.js";

// Routes map HTTP methods and paths to controllers.
export const apiRouter: ExpressRouter = Router();

apiRouter.get("/health", healthController);
apiRouter.get("/auth/me", requireAuth, meController);
apiRouter.get("/status", statusController);
apiRouter.get("/zones", zonesController);
apiRouter.get("/zones/lookup", zoneLookupController);
apiRouter.get("/reallocation", reallocationController);
apiRouter.get("/model-accuracy", modelAccuracyController);
apiRouter.post("/chat", chatController);
apiRouter.get("/umkm", umkmListController);
apiRouter.get("/umkm/:id", umkmDetailController);
apiRouter.get("/dashboard-summary", dashboardSummaryController);
apiRouter.get("/policy-recommendations", policyRecommendationsController);

apiRouter.post(
  "/umkm-self-reports",
  requireAuth,
  requireRole("umkm"),
  createUmkmSelfReportController,
);
apiRouter.get(
  "/umkm-self-reports",
  requireAuth,
  requireRole("operator_tod", "pemda_admin"),
  listUmkmSelfReportsController,
);

apiRouter.post(
  "/reallocation-requests",
  requireAuth,
  requireRole("umkm"),
  createReallocationRequestController,
);
apiRouter.get(
  "/reallocation-requests",
  requireAuth,
  requireRole("operator_tod", "pemda_admin"),
  listReallocationRequestsController,
);
apiRouter.patch(
  "/reallocation-requests/:id",
  requireAuth,
  requireRole("operator_tod", "pemda_admin"),
  decideReallocationRequestController,
);
