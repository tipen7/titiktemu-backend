import { Router, type Router as ExpressRouter } from "express";

// Routes map HTTP methods and paths to controllers.
// This router is intentionally not mounted until a real endpoint is implemented.
export const apiRouter: ExpressRouter = Router();
