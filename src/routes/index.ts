import { type Router as ExpressRouter, Router } from "express";
import { healthController, statusController } from "../controllers/index.js";

// Routes map HTTP methods and paths to controllers.
export const apiRouter: ExpressRouter = Router();

apiRouter.get("/health", healthController);
apiRouter.get("/status", statusController);
