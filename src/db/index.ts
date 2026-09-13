import { Pool, type QueryResultRow } from "pg";
import { appConfig } from "../config/index.js";

// Database clients and connection setup belong in this module.
let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: appConfig.databaseUrl });
  return pool;
}

// Shared query helper for repositories, so connection setup stays in this
// module only.
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(
    text,
    params as unknown[] | undefined,
  );
  return result.rows;
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
