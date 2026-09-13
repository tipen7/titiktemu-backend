import { appConfig } from "../../config/index.js";
import type { ScoringAdapter } from "./scoring-adapter.interface.js";
import { HttpScoringAdapter } from "./scoring-adapter.js";
import { MockScoringAdapter } from "./scoring-adapter.mock.js";

export type { ScoringAdapter } from "./scoring-adapter.interface.js";

export function getScoringAdapter(): ScoringAdapter {
  return appConfig.mlScoringServiceUrl
    ? new HttpScoringAdapter(appConfig.mlScoringServiceUrl)
    : new MockScoringAdapter();
}
