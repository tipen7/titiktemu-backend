// The "structured DB" half of retrieval -- pulls real, live data relevant
// to the user's message from the same tables/repositories the rest of the
// API already reads (see repositories/index.ts). This is what makes the
// chatbot's answers about a specific district/grid grounded in real
// numbers instead of the model guessing.

import {
  type DistrictSummary,
  type GridDetail,
  readDashboardSummary,
  readDistrictSummary,
  readGridDetail,
  readKnownDistrictNames,
} from "../../repositories/index.js";
import { retrieveKnowledge } from "./knowledge-base.js";

const GRID_ID_PATTERN = /\b([a-z]+_\d{3}_\d{3})\b/i;

export interface RetrievedContext {
  districtSummaries: DistrictSummary[];
  gridDetail: GridDetail | null;
  dashboardSummary: Record<string, unknown> | null;
  knowledgeSnippets: string[];
}

/** Finds which of the real, known district names (if any) the message mentions -- case-insensitive substring match, not fuzzy, since district names are short and few. */
function findMentionedDistricts(
  message: string,
  knownDistricts: string[],
): string[] {
  const lower = message.toLowerCase();
  return knownDistricts.filter((name) => lower.includes(name.toLowerCase()));
}

export async function buildContext(message: string): Promise<RetrievedContext> {
  const knownDistricts = await readKnownDistrictNames();
  const mentionedDistricts = findMentionedDistricts(message, knownDistricts);

  const gridId = message.match(GRID_ID_PATTERN)?.[1];
  const [districtSummaries, gridDetail, dashboardSummary] = await Promise.all([
    Promise.all(
      mentionedDistricts.map((name) => readDistrictSummary(name)),
    ).then((results) =>
      results.filter((r): r is DistrictSummary => r !== null),
    ),
    gridId ? readGridDetail(gridId) : Promise.resolve(null),
    // Always include the latest dashboard summary -- cheap, and general
    // questions ("bagaimana kondisi kawasan secara umum?") need it even
    // without a specific district/grid mention.
    readDashboardSummary(),
  ]);

  return {
    districtSummaries,
    gridDetail,
    dashboardSummary,
    knowledgeSnippets: retrieveKnowledge(message),
  };
}

/** Renders the retrieved context into plain text for the LLM prompt. */
export function formatContext(context: RetrievedContext): string {
  const parts: string[] = [];

  if (context.districtSummaries.length > 0) {
    parts.push(
      "Data ringkasan kawasan (real, dari database):\n" +
        context.districtSummaries
          .map(
            (d) =>
              `- ${d.district_name}: ${d.total_cells} grid cell (${d.danger_count} bahaya, ` +
              `${d.moderate_count} waspada, ${d.safe_count} aman), rata-rata indeks kerentanan ` +
              `${d.avg_vulnerability_index.toFixed(3)}, rata-rata matching score ${d.avg_matching_score.toFixed(1)}`,
          )
          .join("\n"),
    );
  }

  if (context.gridDetail) {
    const g = context.gridDetail;
    const labels = ["Aman", "Waspada", "Bahaya"];
    parts.push(
      `Data grid ${g.grid_id} (real, dari database): kawasan ${g.district_name ?? "-"}, ` +
        `kecamatan ${g.kecamatan ?? "-"}, status ${labels[g.ews_code] ?? "-"}, ` +
        `indeks kerentanan ${g.vulnerability_index.toFixed(3)}, matching score ${g.matching_score.toFixed(1)}` +
        (g.narrative ? `. Narasi kebijakan: ${g.narrative}` : ""),
    );
  }

  if (context.dashboardSummary) {
    const s = context.dashboardSummary as Record<string, unknown>;
    parts.push(
      `Ringkasan dashboard terkini (real, dari batch run terakhir): total ${s.total_grid_cells} grid cell, ` +
        `${s.danger_zone_count} bahaya, ${s.moderate_zone_count} waspada, ${s.safe_zone_count} aman. ` +
        `Akurasi model tervalidasi: ${s.ews_validation_accuracy_pct}% (n=${s.ews_validation_n}, ` +
        `tingkat keyakinan: ${s.confidence_level}).`,
    );
  }

  if (context.knowledgeSnippets.length > 0) {
    parts.push(
      "Catatan metodologi relevan:\n" +
        context.knowledgeSnippets.map((s) => `- ${s}`).join("\n"),
    );
  }

  return parts.join("\n\n");
}
