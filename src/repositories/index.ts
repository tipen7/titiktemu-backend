import { type DatabaseStatus, getDatabaseStatus } from "../db/index.js";

// Repositories isolate persistence queries from the service layer.
export async function readRepositoryStatus(): Promise<DatabaseStatus> {
  return getDatabaseStatus();
}
