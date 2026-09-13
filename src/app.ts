import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { appConfig } from "./config/index.js";
import { openApiDocument } from "./docs/openapi.js";
import {
  disableCspForDocs,
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "./middleware/index.js";
import { apiRouter } from "./routes/index.js";

export const app: Express = express();

app.use(helmet());
app.use(cors({ origin: appConfig.corsOrigin }));
// A single page view fires ~5 GET requests (zones, dashboard-summary,
// model-accuracy, umkm, policy-recommendations), and dashboard usage means
// frequent reloads/navigation -- 100 req/15min was exhausted by normal
// interactive use, not just abuse. 1000/15min still meaningfully throttles
// scripted abuse without 429-ing a real user browsing the app.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000 }));
app.use(express.json());
app.use(requestLogger);

app.use("/api", apiRouter);

app.use(
  "/api/docs",
  disableCspForDocs,
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);
app.get("/api/docs.json", (_request, response) => {
  response.json(openApiDocument);
});

app.use(notFoundHandler);
app.use(errorHandler);
