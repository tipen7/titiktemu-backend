# Titik Temu Backend

TypeScript backend service for Titik Temu. The project currently provides a small Express server foundation and is prepared for a layered API backed by Supabase/PostgreSQL.

> **Project status:** Fase 0 (Setup & Foundation) complete. The active architecture reads precomputed output from **titiktemu-analytics** (a separate Python batch pipeline, not in this workspace) via plain SQL: zones/reallocation/model-accuracy, UMKM listing, dashboard summary, and policy recommendations are all served this way, plus an Asisten AI TitikTemu chatbot (RAG over those same tables, LLM provider selectable via `LLM_PROVIDER` -- Gemini, OpenAI, or Claude). Auth is wired to Supabase Auth (`requireAuth`/`requireRole` in `src/middleware/index.ts`, `GET /api/auth/me`) but not yet enforced on any of the read-model endpoints above — see "Database and Supabase" below.
>
> An earlier in-repo data pipeline (MAPID/OSM/Sentinel-2 batch ingest into this repo's own PostGIS tables, a walking-distance isochrone endpoint, a mock scoring-service proxy, and an on-demand LLM narrative endpoint) was removed after the titiktemu-analytics-backed approach above superseded it and the frontend confirmed it had zero consumers. If you're looking for `grid`/`mapid_staging`/`osm_road`-style tables, adapters, or `/api/isochrone`, `/api/score/*`, `/api/narrative` — they no longer exist; see git history if you need to resurrect any of it.
> **Project status:** Core business endpoints are implemented and read real data from titiktemu-analytics' batch pipeline (zones, reallocation, model accuracy, UMKM listings, dashboard summary, policy recommendations) plus a scope-limited RAG chatbot. The layered architecture (routes → controllers → services → repositories) is wired end-to-end. Authentication is not yet implemented (in progress separately) — endpoints that would otherwise be user-scoped currently serve all data unscoped.

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
| `DATABASE_URL` | PostgreSQL connection string. Used by `GET /api/status` to report DB connectivity, and by `/api/zones`, `/api/zones/lookup`, `/api/reallocation`, `/api/umkm`, `/api/dashboard-summary`, `/api/policy-recommendations` to read titiktemu-analytics' output tables | Yes |
| `CORS_ORIGIN` | Comma-separated allowed browser origins | No. Defaults to `http://localhost:3000`. |
| `LLM_PROVIDER` | LLM backend for the `/api/chat` RAG chatbot: `gemini` \| `openai` \| `claude` | No. Defaults to `gemini`. |
| `GEMINI_API_KEY` | Google AI Studio key, used when `LLM_PROVIDER=gemini` | Yes, for `/api/chat` under that provider (other endpoints work without it) |
| `GEMINI_MODEL` | Gemini model name | No. Defaults to `gemini-3.6-flash`. |
| `OPENAI_API_KEY` | OpenAI key, used when `LLM_PROVIDER=openai` | Yes, for `/api/chat` under that provider |
| `OPENAI_MODEL` | OpenAI model name | No. Defaults to `gpt-4o-mini`. |
| `ANTHROPIC_API_KEY` | Anthropic key, used when `LLM_PROVIDER=claude` | Yes, for `/api/chat` under that provider |
| `ANTHROPIC_MODEL` | Claude model name | No. Defaults to `claude-3-5-haiku-latest`. |

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
| `POST` | `/api/umkm-self-reports` | UMKM user submits their own survey data (rent, revenue, tenant info) for a future analytics batch import. Requires role `umkm`. | Created self-report, 201 |
| `GET` | `/api/umkm-self-reports?status=&limit=&offset=` | Operator review list of submitted self-reports. Requires role `operator_tod`/`pemda_admin`. | `{rows, total}` |
| `POST` | `/api/reallocation-requests` | UMKM user requests relocating to one candidate grid from `/api/reallocation` ("Pengajuan Realokasi" -- distinct from the read-only Laporan Alokasi above). Requires role `umkm`. | Created request, 201 |
| `GET` | `/api/reallocation-requests?status=&limit=&offset=` | Operator review list of reallocation requests. Requires role `operator_tod`/`pemda_admin`. | `{rows, total}` |
| `PATCH` | `/api/reallocation-requests/:id` | Operator approves/rejects a pending reallocation request. Requires role `operator_tod`/`pemda_admin`. | Updated request, or 404 |
| `GET` | `/api/auth/me` | Current authenticated user's profile (requires `Authorization: Bearer <Supabase access token>`) | `{id, email, role, fullName}`, or 401 |

`ZoneDetail` (returned by `/api/zones/lookup` and nested in `/api/reallocation`) carries `model_accuracy` too, so a zone's own detail view can show the confidence badge without a second request.

The `/api/zones*`, `/api/reallocation`, `/api/model-accuracy`, `/api/umkm*`, `/api/dashboard-summary`, and `/api/policy-recommendations` endpoints read tables written by **titiktemu-analytics**' batch pipeline (`spatial_grids`, `gentrification_risk_scores`, `policy_recommendations`, `reallocation_candidates`, `spatial_grids_geojson`, `umkm_businesses`, `dashboard_summary`) via plain SQL against `DATABASE_URL` -- see `src/repositories/index.ts`. titiktemu-analytics is an external Python repo not present in this workspace; it manages its own tables independently of `supabase/migrations/`. Zone/reallocation endpoints return empty/`eligible: false` if that pipeline hasn't run yet, or if a location falls in a "waspada" (medium-risk) zone, since the analytics pipeline only precomputes reallocation candidates for "bahaya" (high-risk) zones today.

`/api/chat` additionally requires the API key for whichever `LLM_PROVIDER` is selected — see `src/services/chat/llm/`.
| `GET` | `/api/model-accuracy` | Latest EWS/matching_score model accuracy -- one figure per batch run, not per cell | `{accuracy_pct, n, ci_95_low_pct, ci_95_high_pct, confidence_level, computed_at}`, or 404 if analytics hasn't run yet |
| `GET` | `/api/umkm?search=&ews_code=&district=&limit=&offset=` | Filterable list of real UMKM business records (Discovery Map, Self-Tracker, Tenant Matching) | `{rows: UmkmBusiness[], total}` |
| `GET` | `/api/umkm/:id` | Single UMKM business detail | `UmkmBusiness`, or 404 |
| `GET` | `/api/dashboard-summary` | Latest aggregate dashboard metrics (zone counts, by-district breakdown, model accuracy) | `DashboardSummary`, or 404 if analytics hasn't run yet |
| `GET` | `/api/policy-recommendations` | Narrative policy recommendations per flagged grid cell | `PolicyRecommendation[]` |
| `POST` | `/api/chat` | Scope-limited RAG chatbot (zones/gentrification/reallocation/tenant-matching/ESG only) for both UMKM and operator users | `{reply, in_scope, ...}` -- see `src/services/chat/` |

`ZoneDetail` (returned by `/api/zones/lookup` and nested in `/api/reallocation`) carries `model_accuracy` too, so a zone's own detail view can show the confidence badge without a second request.

Most endpoints read tables written by **titiktemu-analytics**' batch pipeline (`spatial_grids`, `gentrification_risk_scores`, `policy_recommendations`, `reallocation_candidates`, `umkm_businesses`, `dashboard_summary`, `spatial_grids_geojson` -- see `supabase/migrations/002_analytics_schema.sql`) via plain SQL against `DATABASE_URL` -- see `src/repositories/index.ts`. They return empty/`eligible: false`/404 if that pipeline hasn't run yet, or if a location falls in a "waspada" (medium-risk) zone, since the analytics pipeline only precomputes reallocation candidates for "bahaya" (high-risk) zones today.

None of these endpoints are scoped to a signed-in user yet -- there is no authentication in this repo (see "Project status" above). `/api/umkm` and friends return every real record, not "the current user's" records.

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
│   ├── config/           # Configuration and environment parsing
│   ├── controllers/      # HTTP request/response handlers
│   ├── db/               # Database and Supabase client setup
│   ├── middleware/       # Express middleware such as security and auth
│   ├── repositories/     # Persistence and database access layer
│   ├── routes/           # Route and router registration
│   ├── services/         # Application and domain business logic
│   │   └── chat/          # Asisten AI TitikTemu chatbot (RAG over titiktemu-analytics tables + llm/ provider dispatch)
│   ├── types/            # Shared TypeScript types (titiktemu-analytics' output row shapes)
│   └── validators/       # Request and response validation schemas
├── supabase/
│   └── migrations/       # Database migrations (001_init.sql: PostGIS extension, users, grid, umkm_report;
│                          # 002/003: local mock stand-in for titiktemu-analytics' schema + seed data;
│                          # 004_auth_profiles.sql: wires users to Supabase Auth)
│   └── migrations/       # Database migrations (001_init.sql: PostGIS, users, grid, umkm_report;
│                         #   002_analytics_schema.sql: the real tables the app queries today --
│                         #   spatial_grids, gentrification_risk_scores, umkm_businesses, etc.)
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

The `src/` subdirectories describe the intended ownership boundaries. New endpoints should normally flow through `routes` -> `controllers` -> `services` -> `repositories`, with validation and cross-cutting behavior handled by `validators` and `middleware`. Keep database-specific details inside `db` and `repositories` so controllers remain focused on HTTP concerns. If a feature needs an external API integration, put it behind an adapter interface in a new `src/adapters/` directory (see "Development conventions" below) — no adapters exist today.

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

There are seven files under `supabase/migrations/`, applied in order:

- **`001_init.sql`** — the original Fase 0 schema: the `postgis` extension, `user_role`/`report_status` enums, and skeletal `users`, `grid`, and `umkm_report` tables. `grid`/`umkm_report` are dead (nothing reads or writes them) — kept for a possible future in-house pipeline.
- **`002_analytics_schema.sql`** — the real tables the app actually queries today (`spatial_grids`, `gentrification_risk_scores`, `policy_recommendations`, `reallocation_candidates`, `umkm_businesses`, `dashboard_summary`, plus the `spatial_grids_geojson` view), matching exactly what titiktemu-analytics' batch pipeline writes. A separate concern from `001`'s tables — no foreign keys between the two.
- **`003_seed_real_data.sql`** — real data, not schema: a full snapshot of a genuine titiktemu-analytics pipeline run (v3+v5 real UMKM survey data, 64.7% real/LOOCV-validated model accuracy, n=119) for every table `002` creates. This is what makes a freshly-provisioned database (yours, a teammate's, or a new Supabase project) immediately usable for frontend/backend development and demos without waiting ~30-60 minutes for a real pipeline run. **One-time seed for a fresh, empty database** — re-running it against an already-seeded one fails on duplicate primary keys (expected; a real pipeline run, not this file, is how the data refreshes going forward).
- **`004_auth_profiles.sql`** — wires `users` to Supabase Auth (the team committed to it as the RBAC identity provider): `users.id` now references `auth.users(id)`, `password_hash` is gone (Supabase Auth owns credentials), and a `handle_new_user` trigger creates the matching `public.users` row — with the role from `supabase.auth.signUp`'s `options.data.role` — the moment someone signs up. Local docker-compose Postgres has no real `auth` schema, so this migration also creates a minimal shim `auth.users` (guarded with an explicit catalog existence check, a no-op against a real Supabase project) purely so the schema/trigger/FK can exist locally; nothing writes to that shim automatically (no local GoTrue), so exercising real signup/login end-to-end requires pointing `DATABASE_URL`/`SUPABASE_URL` at the real Supabase project. `src/middleware/index.ts` exports `requireAuth`/`requireRole(...roles)` built on top of this.
- **`005_umkm_self_reports.sql`** / **`006_reallocation_requests.sql`** — two net-new, standalone write-path tables backing `/api/umkm-self-reports` and `/api/reallocation-requests` (see "Current API" above). Neither reuses or touches `001`'s dead `umkm_report` table or `002`'s analytics tables (beyond `006`'s `spatial_grids(grid_id)` FK, following the same convention `002` itself uses).
- **`007_umkm_self_report_category.sql`** — adds `category` (business type: kuliner/jasa/retail/etc., a real modeling-relevant field distinct from `tenant_type`'s tetap/musiman/franchise distinction) to `umkm_self_reports`.

`001`, `002`, `004`, `005`, `006`, `007` are idempotent (`CREATE TABLE/COLUMN IF NOT EXISTS`, or an explicit existence check where `IF NOT EXISTS` isn't available) and safe to re-run; `003` is not (see above).

- **Local development**: `docker compose up -d` applies every file automatically, in filename order, against a fresh volume (see "Start the local database" above).
- **Against a real Supabase project**: create the project in the Supabase dashboard, enable the PostGIS extension under `Database > Extensions`, then run each file against it in order — they're portable between environments:
  ```bash
  for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
  ```
- `002`'s tables are also created ad hoc by titiktemu-analytics' `ensure_schema()` (a local-dev convenience for that repo, not the source of truth) -- this migration is the actual source of truth for their shape; keep the two in sync if you change one.
- Keep persistence logic in `src/repositories/` and database client setup in `src/db/`.
- Document any new required variables and migration commands here as they're added.

## Development conventions

- Use the existing TypeScript and ESM configuration; relative imports must include an explicit `.js` extension (required by `moduleResolution: nodenext`).
- Validate untrusted request data at the API boundary with Zod schemas.
- Keep controllers thin and move business rules into services.
- If you add a new external API integration, put it behind an adapter interface in `src/adapters/`, with a mock implementation validated through its Zod schema, so development isn't blocked on an unconfirmed third-party contract. (No adapters exist today — the previous MAPID/OSM/Sentinel-2/scoring ones were removed as unused; the chatbot calls its LLM provider directly instead, see `src/services/chat/llm/` -- Gemini, OpenAI, or Claude, selected via `LLM_PROVIDER`.)
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
