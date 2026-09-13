import { type Router as ExpressRouter, Router } from "express";
import { healthController, statusController } from "../controllers/index.js";
import { isochroneController } from "../controllers/isochrone.controller.js";
import { narrativeController } from "../controllers/narrative.controller.js";
import {
  riskClassificationController,
  tenantMatchingController,
} from "../controllers/scoring.controller.js";

// Routes map HTTP methods and paths to controllers.
export const apiRouter: ExpressRouter = Router();

apiRouter.get("/health", healthController);
apiRouter.get("/status", statusController);
apiRouter.get("/isochrone", isochroneController);
apiRouter.post("/score/risk-classification", riskClassificationController);
apiRouter.post("/score/tenant-matching", tenantMatchingController);
apiRouter.post("/narrative", narrativeController);
