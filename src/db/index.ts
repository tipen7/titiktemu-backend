import { Pool } from "pg";
import { appConfig } from "../config/index.js";

// Database clients and connection setup belong in this module.
let pool: Pool | undefined;

function getPool(): Pool {
  pool ??= new Pool({ connectionString: appConfig.databaseUrl });
  return pool;
}

export type DatabaseStatus = "ok" | "error";

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!appConfig.databaseUrl) return "error";
  try {
    await getPool().query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}
