// Central application configuration belongs in this module.
// Keep environment parsing here so the rest of the application uses typed values.
export const appConfig = {
  environment: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
} as const;
