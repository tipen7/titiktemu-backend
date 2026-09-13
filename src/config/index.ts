import dotenv from "dotenv";

// override: true -- verified this machine has a stray, unrelated, malformed
// system-wide DATABASE_URL env var (typo'd "ppostgresql://", wrong
// host/password) that silently wins over this project's own .env under
// dotenv's default behavior (never overrides an existing env var). Found
// via titiktemu-analytics hitting the identical bug in its own Python
// config (pydantic-settings has the same default precedence) -- this
// project's .env should be authoritative for this project's config, not
// shadowed by unrelated global machine state.
dotenv.config({ override: true });

// Central application configuration belongs in this module.
// Keep environment parsing here so the rest of the application uses typed values.
export const appConfig = {
  environment: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim()),
  databaseUrl: process.env.DATABASE_URL,
  llmProvider: (process.env.LLM_PROVIDER ?? "gemini") as
    | "gemini"
    | "openai"
    | "claude",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
} as const;
