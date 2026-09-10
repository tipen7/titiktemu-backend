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
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
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
