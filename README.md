# Titik Temu Backend

TypeScript backend service for Titik Temu. The project currently provides a small Express server foundation and is prepared for a layered API backed by Supabase/PostgreSQL.

> **Project status:** Fase 0 (Setup & Foundation) complete. Fase 1/Minggu 1 (Data Preparation) backend scope mostly done: batch ingest jobs for MAPID and OSM land data into PostGIS staging tables, Sentinel-2 NDBI is seeded with sample/precomputed values as an intentional MVP fallback (real computation needs a Python geospatial service that doesn't exist here), and a topology/data quality check pipeline (Hari 5) runs over all of it. The only Minggu 1 MUST item still outstanding is the BPS kepadatan penduduk spatial-join import, deferred until a source data file is available (see "Data ingestion" below). Fase 2/Minggu 3 (AI & Algoritma Engine) gateway-side scope is done: `GET /api/isochrone` (real OSM/pgRouting network analysis), `POST /api/score/risk-classification` + `/tenant-matching` (proxy to the ML team's XGBoost service, mock until it exists), and `POST /api/narrative` (real Gemini LLM orchestration, with timeout + fallback). GWR/XGBoost model training, the FastAPI ML service itself, IDW interpolation, and the GWR cron scheduler are the ML team's responsibility and out of scope for this repo. Other business endpoints (UMKM reports, ESG dashboard, RBAC, etc.) are not implemented yet.
>
> This repo covers the `/gateway` (Node.js) role only. The `/ml-service` (Python/FastAPI, for GWR/XGBoost/Sentinel-2 processing) and `/infra` components called for in the project plan don't exist yet in this workspace.

## Requirements

- Node.js 20 or newer
- pnpm 10.15.0 (the version declared by `packageManager`)
- Docker (for the local PostgreSQL + PostGIS database via `docker-compose.yml`)
- A Supabase project, when deploying against managed Supabase/PostgreSQL

Check the installed tools before starting:

```bash
node --version
pnpm --version
```

## Getting started

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

### 2. Configure environment variables

Create a local `.env` file from the committed template:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Set values appropriate for your local environment. Do not commit `.env`, Supabase service-role keys, database passwords, or other secrets.

| Variable | Purpose | Required today? |
| --- | --- | --- |
| `PORT` | HTTP port for the API | No. Defaults to `4000`. |
| `NODE_ENV` | Runtime environment name | No |
| `SUPABASE_URL` | Supabase project URL | Not yet used by any endpoint |
| `SUPABASE_ANON_KEY` | Supabase public/anonymous API key | Not yet used by any endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side key | Not yet used by any endpoint; keep private |
| `DATABASE_URL` | PostgreSQL connection string. Used by `GET /api/status` to report DB connectivity, and by `/api/zones`, `/api/zones/lookup`, `/api/reallocation` to read titiktemu-analytics' output tables | Yes |
| `CORS_ORIGIN` | Comma-separated allowed browser origins | No. Defaults to `http://localhost:3000`. |

The values in `.env.example` are placeholders. Replace them before enabling database or Supabase-backed features.

### 3. Start the local stack

`docker-compose.yml` provides three services: `db` (PostgreSQL + PostGIS, applying every file under `supabase/migrations/` automatically on first run), `redis`, and `app` (the gateway itself, built from `Dockerfile`):

```bash
docker compose up -d
```

`db` publishes on host port `5433` (container-internal `5432`) to avoid clashing with a native PostgreSQL install — so from the host machine (e.g. running `pnpm dev` outside Docker), set `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/titiktemu` in `.env`. The `app` service instead reaches it at `db:5432`, the in-network hostname, which is already set in `docker-compose.yml`.

To run only the database (e.g. while developing the app with `pnpm dev` on the host), start just that service: `docker compose up -d db`.

Note: `/docker-entrypoint-initdb.d` migrations only run once, against a fresh volume. To re-apply after changing `supabase/migrations/`, either run `docker compose down -v` (dev-only — destroys local data) or apply the new file manually with `psql`.

### 4. Run the development server

```bash
pnpm dev
```

The development command runs `src/index.ts` through `tsx` and watches for changes. Verify the server at:

```text
http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok"}
```

### 5. Build and run production output

```bash
pnpm build
pnpm start
```

`pnpm build` compiles TypeScript from `src/` into `dist/`, including source maps and declaration files. `pnpm start` runs `dist/index.js` with Node.js. A `Dockerfile` is also provided for containerized builds.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the watch-mode development server with `tsx` |
| `pnpm build` | Type-check and compile the project into `dist/` |
| `pnpm start` | Run the compiled production entrypoint |
| `pnpm lint` | Check formatting, import order, and lint rules with Biome |
| `pnpm lint:fix` | Apply Biome's safe fixes |
| `pnpm test` | Run the Vitest test suite |
| `pnpm ingest:mapid` | Run the MAPID batch ingest job (see "Data ingestion") |
| `pnpm ingest:osm` | Run the OSM batch ingest job (see "Data ingestion") |
| `pnpm ingest:sentinel2` | Run the Sentinel-2 NDBI batch ingest job (see "Data ingestion") |
| `pnpm check:data-quality` | Run the topology/data quality check pipeline (see "Data ingestion") |

## Current API

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Liveness check | `{"status":"ok"}` |
| `GET` | `/api/status` | Liveness + DB connectivity (Controller → Service → Repository → DB) | `{"status":"ok"\|"degraded","database":"ok"\|"error"}` (503 if degraded) |
| `GET` | `/api/zones` | All scored grid cells as GeoJSON (Discovery Map base layer) | GeoJSON `FeatureCollection` |
| `GET` | `/api/zones/lookup?lat=&lng=` | Zone detail for one location (UMKM Self Discovery Tracker) | Zone detail, or 404 outside the study area |
| `GET` | `/api/reallocation?lat=&lng=` | Reallocation candidates for one location (Smart Tenant Matching Engine's "View Reallocation") | `{found, eligible, zone, candidates, message?}` |
| `GET` | `/api/model-accuracy` | Latest EWS/matching_score model accuracy -- one figure per batch run, not per cell | `{accuracy_pct, confidence_level, computed_at}`, or 404 if analytics hasn't run yet |
| `POST` | `/api/chat` | Asisten AI TitikTemu chatbot, scoped to TitikTemu's domain (Operator/UMKM) | `{answer, highlight_grid_ids, in_scope}` |
| `GET` | `/api/umkm` | Paginated/filterable UMKM business listing (Discovery Map favorites, Self-Tracker table) | `{rows, total}` |
| `GET` | `/api/umkm/:id` | Single UMKM business detail | UMKM business detail, or 404 |
| `GET` | `/api/dashboard-summary` | Latest ESG dashboard / Operator beranda summary | Dashboard summary object, or 404 if analytics hasn't run yet |
| `GET` | `/api/policy-recommendations` | Policy narratives for Laporan Alokasi, optionally filtered by type | Array of policy recommendations |
| `GET` | `/api/isochrone` | Walking-distance isochrone from the OSM road network (see "AI & algorithm engine") | GeoJSON hull + reached edges |
| `POST` | `/api/score/risk-classification` | EWS risk classification, proxied to the ML team's scoring service (mock today) | `{"gridId","riskCode","confidence"}` |
| `POST` | `/api/score/tenant-matching` | Smart Tenant Matching score, proxied to the ML team's scoring service (mock today) | `{"gridId","businessCategory","matchScore"}` |
| `POST` | `/api/narrative` | LLM policy narrative from a JSON payload (Gemini, with fallback) | `{"narrative","generatedByLlm"}` |

`ZoneDetail` (returned by `/api/zones/lookup` and nested in `/api/reallocation`) carries `model_accuracy` too, so a zone's own detail view can show the confidence badge without a second request.

The `/api/zones*`, `/api/reallocation`, `/api/model-accuracy`, `/api/umkm*`, `/api/dashboard-summary`, and `/api/policy-recommendations` endpoints read tables written by **titiktemu-analytics**' batch pipeline (`spatial_grids`, `gentrification_risk_scores`, `policy_recommendations`, `reallocation_candidates`, `spatial_grids_geojson`, `umkm_businesses`, `dashboard_summary`) via plain SQL against `DATABASE_URL` -- see `src/repositories/index.ts`. **This is a separate schema from the one this repo's own `supabase/migrations/` manages** (`grid`, `mapid_staging`, `osm_road`, etc. -- see "Data ingestion" below); titiktemu-analytics is an external Python repo not present in this workspace, and manages its own tables independently. Zone/reallocation endpoints return empty/`eligible: false` if that pipeline hasn't run yet, or if a location falls in a "waspada" (medium-risk) zone, since the analytics pipeline only precomputes reallocation candidates for "bahaya" (high-risk) zones today.

`/api/chat` additionally requires `GEMINI_API_KEY` to be set — see `src/services/chat/`.

The server listens on `PORT` (default `4000`) via `src/config/index.ts`.

## API documentation

Interactive Swagger UI is served at:

```text
http://localhost:4000/api/docs
```

The raw OpenAPI 3.0 document is available at `GET /api/docs.json`. The spec is hand-maintained in `src/docs/openapi.ts` — add a `paths` entry there whenever a new endpoint is added under `src/routes/`.

## Project structure

```text
.
├── src/
│   ├── index.ts          # Application bootstrap (listen())
│   ├── app.ts            # Express app construction (importable, no listen())
│   ├── app.test.ts        # Smoke test for the app
│   ├── adapters/         # External integration adapters
│   │   ├── mapid/         # MAPID adapter interface + mock (real contract unconfirmed, Asumsi A3)
│   │   ├── osm/           # OSM adapter interface + real Overpass API implementation + mock
│   │   ├── sentinel2/     # Sentinel-2 NDBI adapter interface + mock (sample/precomputed fallback)
│   │   ├── gemini/        # Gemini narrative adapter interface + real implementation + mock
│   │   └── scoring/       # ML scoring (XGBoost) adapter interface + real HTTP client + mock
│   ├── config/           # Configuration and environment parsing
│   ├── controllers/      # HTTP request/response handlers
│   ├── db/               # Database and Supabase client setup
│   ├── middleware/       # Express middleware such as security and auth
│   ├── repositories/     # Persistence and database access layer
│   ├── routes/           # Route and router registration
│   ├── scripts/          # One-off CLI entry points (batch ingest jobs, data quality check)
│   ├── services/         # Application and domain business logic
│   │   ├── ingest/        # Batch ingest jobs (MAPID, OSM, Sentinel-2) — see "Data ingestion" below
│   │   ├── data-quality/  # Topology/data quality check pipeline — see "Data ingestion" below
│   │   └── chat/          # Asisten AI TitikTemu chatbot (RAG over titiktemu-analytics tables + Gemini)
│   ├── types/            # Shared TypeScript types (titiktemu-analytics' output row shapes)
│   └── validators/       # Request and response validation schemas
├── supabase/
│   └── migrations/       # Database migrations (001_init.sql: PostGIS/users/grid/umkm_report;
│                          # 002_ingest_pipeline.sql: ingest staging tables + job audit log;
│                          # 003_isochrone_topology.sql: pgRouting + osm_road topology columns)
├── .github/workflows/    # CI (lint, build, test on push/PR to main)
├── docker-compose.yml    # Local db (PostgreSQL+PostGIS) + redis + app (gateway) for development
├── Dockerfile            # Production container build
├── biome.json            # Lint/format configuration (Biome)
├── .env.example          # Environment variable template
├── .gitignore            # Ignored local files and dependencies
├── package.json          # Scripts, dependencies, and package metadata
├── pnpm-lock.yaml        # Locked dependency versions
├── tsconfig.json         # TypeScript compiler configuration
└── README.md             # Project documentation
```

The `src/` subdirectories describe the intended ownership boundaries. New endpoints should normally flow through `routes` -> `controllers` -> `services` -> `repositories`, with validation and cross-cutting behavior handled by `validators` and `middleware`. Keep database-specific details inside `db` and `repositories` so controllers remain focused on HTTP concerns. Keep external API integrations inside `adapters`, behind an interface, so a mock implementation can stand in until the real integration's contract is confirmed.

## Dependencies

### Runtime dependencies

| Package | Role |
| --- | --- |
| `express` | HTTP server and routing |
| `@supabase/supabase-js` | Supabase client integration |
| `pg` | PostgreSQL client integration |
| `zod` | Runtime schema validation |
| `cors` | Cross-origin request handling |
| `helmet` | HTTP security headers |
| `express-rate-limit` | Request rate limiting |
| `dotenv` | Loading environment variables from `.env` |
| `swagger-ui-express` | Serves interactive API docs at `/api/docs` from `src/docs/openapi.ts` |

### Development dependencies

| Package | Role |
| --- | --- |
| `typescript` | Static type checking and compilation |
| `tsx` | Running TypeScript directly during development |
| `@biomejs/biome` | Linting, formatting, and import ordering (`pnpm lint`) |
| `vitest`, `supertest` | Test runner and HTTP assertions (`pnpm test`) |
| `@types/express`, `@types/cors`, `@types/node`, `@types/pg`, `@types/supertest`, `@types/swagger-ui-express` | TypeScript declarations |

> **Note:** `typescript-eslint` is not used here — as of `typescript@7.0.2`, `typescript-eslint` does not support TypeScript's new native (Go-based) compiler at all (see [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)). Biome was chosen instead because it has its own TypeScript parser, independent of the TypeScript compiler API.

## TypeScript configuration

The project uses strict TypeScript checking with NodeNext module resolution and ECMAScript 2022 output. Source files live under `src/`; compiled files are emitted under `dist/`. Generated build output should not be committed.

Run the compiler without emitting files when checking a change:

```bash
npx tsc --noEmit
```

## Database and Supabase

`supabase/migrations/001_init.sql` contains the initial schema: the `postgis` extension, `user_role`/`report_status` enums, and skeletal `users`, `grid`, and `umkm_report` tables. `grid` intentionally holds only geometry for now — Fase 1 will add feature columns (`poi_count`, `ndbi_mean`, `dist_to_station`, etc.), likely as a linked `master_grid_dataset` table rather than more columns here.

`supabase/migrations/002_ingest_pipeline.sql` adds the Fase 1 batch ingest landing zone: `ingest_job_log` (audit trail), `mapid_staging`, `osm_road`, `osm_poi`, `sentinel2_ndbi_staging`, and `bps_kepadatan_penduduk`. These hold raw external data before a later ETL/spatial-join step transforms it into `master_grid_dataset`.

- **Local development**: `docker compose up -d` applies every file under `supabase/migrations/` automatically against a fresh volume (see "Start the local stack" above).
- **Against a real Supabase project**: create the project in the Supabase dashboard, enable the PostGIS extension under `Database > Extensions`, then run each file against it in order — they're portable between environments:
  ```bash
  psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
  psql "$DATABASE_URL" -f supabase/migrations/002_ingest_pipeline.sql
  ```
- The `users` table is self-contained (its own UUID primary key, no foreign key to Supabase's `auth.users`) so the same migration works identically against local Docker Postgres and a real Supabase project. Revisit this if the team commits to Supabase Auth as the RBAC identity provider.
- Keep persistence logic in `src/repositories/` and database client setup in `src/db/`.
- Document any new required variables and migration commands here as they're added.

## Data ingestion (Fase 1 / Minggu 1)

Per Asumsi A4 in the project plan, external data (MAPID, OSM, Sentinel-2, BPS) is pulled in batch during data preparation, not via live calls at request time. Each batch job writes an `ingest_job_log` row (status, record count, error message) alongside the staging rows it inserts:

| Command | Source | Adapter | Writes to |
| --- | --- | --- | --- |
| `pnpm ingest:mapid` | Struk Go / Menu Go / Properti Go | `MockMapidAdapter` (real contract unconfirmed — Asumsi A3) | `mapid_staging` |
| `pnpm ingest:osm` | Overpass API, road network + POI, over `STUDY_CORRIDOR_BBOX` (`src/config/corridor.ts`) | `OverpassOsmAdapter` (real, public API) | `osm_road`, `osm_poi` |
| `pnpm ingest:sentinel2` | One NDBI value per row in `grid` | `MockSentinel2Adapter` (sample/precomputed fallback — see below) | `sentinel2_ndbi_staging` |

All three require `DATABASE_URL` to point at a reachable Postgres with `002_ingest_pipeline.sql` applied. `ingest:sentinel2` additionally depends on `grid` already having rows (the "Import & grid-ing data koridor studi" task); until then it runs successfully but ingests 0 records.

**Sentinel-2 NDBI is intentionally a placeholder, not a real computation.** Per test.md's risk mitigation ("jika waktu tidak cukup, gunakan data NDBI sample/precomputed untuk MVP demo"), `MockSentinel2Adapter` returns a fixed sample `ndbiMean` for every grid cell instead of deriving it from actual Sentinel-2 imagery. Real NDBI computation needs a Python geospatial stack (rasterio/eodag, per the risk register) that doesn't exist in this workspace — swap `getSentinel2Adapter()`'s return value in `src/adapters/sentinel2/index.ts` once that exists; `runSentinel2IngestJob` itself won't need to change.

**⚠️ Open item — BPS kepadatan penduduk import is not started.** `bps_kepadatan_penduduk` table exists (`002_ingest_pipeline.sql`) but nothing writes to it. This needs an actual source file (kelurahan boundaries + density figures, e.g. from BPS/BIG) before a spatial-join importer can be written — deliberately deferred until that file is available. Don't let this silently slip past Minggu 1.

Other known gaps, not yet implemented:
- **MAPID "Activity" dataset** — the sprint doc mentions it, but the existing `MapidAdapter` interface only covers Struk Go/Menu Go/Properti Go; no schema for Activity exists yet.
- **`STUDY_CORRIDOR_BBOX`** is an approximate bounding box around the MRT Lebak Bulus–Bundaran HI corridor, not the final buffered corridor geometry from the "Import & grid-ing data koridor studi" task.

### Data quality check (Hari 5 checkpoint)

`pnpm check:data-quality` runs the Fase 1 "validasi topologi & data quality check pipeline" task. It runs a fixed set of independent checks against whatever has already been ingested and records the result as an `ingest_job_log` row (`source = 'data_quality'`) with the full findings in its `metadata` column:

| Check | Severity | What it catches |
| --- | --- | --- |
| `grid_invalid_geometry` | error | `grid` rows failing `ST_IsValid` |
| `osm_road_invalid_geometry` | error | `osm_road` rows failing `ST_IsValid` |
| `osm_poi_invalid_geometry` | error | `osm_poi` rows failing `ST_IsValid` |
| `mapid_staging_missing_location` | warning | `mapid_staging` rows with a null `location` |
| `grid_missing_ndbi_coverage` | warning | `grid` cells with no matching `sentinel2_ndbi_staging` row |
| `ingest_job_stuck_running` | error | ingest jobs still `running` after 1 hour (likely crashed) |
| `ingest_job_failed_recent` | warning | ingest jobs that failed in the last 24 hours |

The script exits non-zero if any `error`-severity issue is found (useful as a CI/pre-deploy gate later), and always prints a human-readable summary. Add new checks to `CHECKS` in `src/services/data-quality/data-quality-check.service.ts` as the staging schema grows (e.g. once BPS import lands).

## AI & algorithm engine (Fase 2 / Minggu 3)

**Scope note:** GWR/XGBoost model training, the FastAPI ML service that serves those models, IDW spatial interpolation, and the weekly GWR cron scheduler are the ML team's responsibility (Python/PySAL/FastAPI) and are out of scope for this repo. What's below is only the gateway-side work: a real network-analysis endpoint, and two integration points designed to plug into the ML team's service once it exists.

### Isochrone (`GET /api/isochrone`)

Real implementation, not a mock — computes actual walking-distance reachability from the `osm_road` network using pgRouting:

```
GET /api/isochrone?lat=-6.2&lng=106.816666&maxDistanceMeters=800
```

`maxDistanceMeters` defaults to `800` (the spec's "0-800m / 10 menit jalan kaki") and is capped at 2000. The response is `{ origin, maxDistanceMeters, reachedNodeCount, hull, edges }`, where `hull` is a GeoJSON `Polygon` (concave hull over reached network nodes) and `edges` are the reached `osm_road` segments as GeoJSON `LineString`s. Returns `404` if no road network exists near the given point.

How it works, in `src/repositories/isochrone.repository.ts`:
1. Snap `(lat, lng)` to the nearest node in `osm_road_vertices_pgr`.
2. Run `pgr_drivingDistance` from that node, using `length_m` (real-world meters via `geom::geography`, independent of the degree-based SRID) as edge cost, excluding motorway/trunk road types.
3. Build a concave hull over the reached nodes and fetch the reached edges.

Requires `supabase/migrations/003_isochrone_topology.sql` (enables the `pgrouting` extension, adds `osm_road.source`/`target`/`length_m`) and a built routing graph. `runOsmIngestJob` (`pnpm ingest:osm`) now calls `rebuildRoadTopology()` after every ingest, so the graph is always rebuilt from the latest data automatically — no separate step needed.

**⚠️ Not verified against a live database.** This was written and type-checked but not run end to end (Docker wasn't available in the environment it was built in). Run `pnpm ingest:osm` then hit `/api/isochrone` against real data before relying on it.

### Scoring proxy (`POST /api/score/risk-classification`, `POST /api/score/tenant-matching`)

The gateway exposes these publicly and forwards to the ML team's XGBoost service via `ScoringAdapter` (`src/adapters/scoring/`) — same adapter-pattern-with-mock convention used for MAPID. `getScoringAdapter()` returns:
- `MockScoringAdapter` (deterministic placeholder, not a model) if `ML_SCORING_SERVICE_URL` is unset — the default today.
- `HttpScoringAdapter` once `ML_SCORING_SERVICE_URL` is set, POSTing to `{baseUrl}/score/risk-classification` / `{baseUrl}/score/tenant-matching` with a 1.2s timeout (keeps the gateway under the spec's < 1.5s p95 once its own overhead is added).

The request/response contract (`src/validators/scoring.validators.ts`) is this repo's own assumption based on test.md's `master_grid_dataset` feature columns (`poiCount`, `distExitTolM`, `distStationM`, `ndbiMean`, `kepadatanPenduduk`, `rentSurgeReported`) — confirm it against whatever the ML team's FastAPI service actually expects before wiring up `HttpScoringAdapter` for real, the same way MAPID's contract needs confirming (Asumsi A3).

### LLM narrative orchestration (`POST /api/narrative`)

Real Gemini integration (not a mock, when `GEMINI_API_KEY` is set). Accepts a `PolicyNarrativePayload` (`{ gridId, riskCode, keyMetrics }` — already-computed data) and returns `{ narrative, generatedByLlm }`:
- `RealGeminiAdapter` (`src/adapters/gemini/gemini-adapter.ts`) calls the Gemini API with a 5s timeout (test.md's risk mitigation) and a prompt that explicitly tells the model to narrate, not recalculate (Asumsi A5).
- If the call fails or times out, `generateNarrative` (`src/services/narrative.service.ts`) catches it and returns `{ narrative: null, generatedByLlm: false }` — **HTTP 200, not an error** — so callers can fall back to showing the raw JSON, per the same risk mitigation.
- Falls back to `MockGeminiAdapter` (canned string, no network call) whenever `GEMINI_API_KEY` is unset — set it in `.env` to exercise the real path. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; override it if that model id changes or isn't available on your API key.

## Development conventions

- Use the existing TypeScript and ESM configuration; relative imports must include an explicit `.js` extension (required by `moduleResolution: nodenext`).
- Validate untrusted request data at the API boundary with Zod schemas.
- Keep controllers thin and move business rules into services.
- Put external API integrations behind an adapter interface in `src/adapters/`, with a mock implementation validated through its Zod schema, so development isn't blocked on an unconfirmed third-party contract.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser clients.
- Add or update focused tests as soon as endpoint behavior is introduced.
- Run `pnpm lint`, `pnpm build`, and `pnpm test` before opening a pull request — CI runs all three on every PR to `main`.

## Contributing

1. Create a focused branch from the current default branch.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env` and configure only the values needed for your work.
4. Make a focused change and update the documentation when setup or behavior changes.
5. Run the available validation commands:

	```bash
	pnpm lint
	pnpm build
	pnpm test
	```

6. Open a pull request describing the change, verification performed, environment variables added, and any migration required.
