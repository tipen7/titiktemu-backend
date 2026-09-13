import { type Router as ExpressRouter, Router } from "express";
import {
  chatController,
  dashboardSummaryController,
  healthController,
  modelAccuracyController,
  policyRecommendationsController,
  reallocationController,
  statusController,
  umkmDetailController,
  umkmListController,
  zoneLookupController,
  zonesController,
} from "../controllers/index.js";

// Routes map HTTP methods and paths to controllers.
export const apiRouter: ExpressRouter = Router();

apiRouter.get("/health", healthController);
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
