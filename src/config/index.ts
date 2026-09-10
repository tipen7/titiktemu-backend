import "dotenv/config";

// Central application configuration belongs in this module.
// Keep environment parsing here so the rest of the application uses typed values.
export const appConfig = {
  environment: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim()),
  databaseUrl: process.env.DATABASE_URL,
} as const;
