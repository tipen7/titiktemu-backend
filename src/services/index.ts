import { readRepositoryStatus } from "../repositories/index.js";

// Services contain application and domain rules between controllers and repositories.
export interface ServiceStatus {
  status: "ok" | "degraded";
  database: "ok" | "error";
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  const database = await readRepositoryStatus();
  return { status: database === "ok" ? "ok" : "degraded", database };
}
