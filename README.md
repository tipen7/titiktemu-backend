# Titik Temu Backend

TypeScript backend service for Titik Temu. The project currently provides a small Express server foundation and is prepared for a layered API backed by Supabase/PostgreSQL.

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
| `GEMINI_API_KEY` | Google AI Studio key for the `/api/chat` RAG chatbot | Yes, for `/api/chat` (other endpoints work without it) |
| `GEMINI_MODEL` | Gemini model name for `/api/chat` | No. Defaults to `gemini-3.6-flash`. |

The values in `.env.example` are placeholders. Replace them before enabling database or Supabase-backed features.

### 3. Start the local database

A `docker-compose.yml` provides a local PostgreSQL + PostGIS instance and applies `supabase/migrations/001_init.sql` automatically on first run:

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` (user `postgres`, password `postgres`, database `titiktemu`). Set `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/titiktemu` in `.env` to point the app at it.

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
│   ├── adapters/         # External integration adapters (MAPID, later OSM/Sentinel-2/Gemini)
│   │   └── mapid/         # MAPID adapter interface + mock implementation
│   ├── config/           # Configuration and environment parsing
│   ├── controllers/      # HTTP request/response handlers
│   ├── db/               # Database and Supabase client setup
│   ├── middleware/       # Express middleware such as security and auth
│   ├── repositories/     # Persistence and database access layer
│   ├── routes/           # Route and router registration
│   ├── services/         # Application and domain business logic
│   └── validators/       # Request and response validation schemas
├── supabase/
│   └── migrations/       # Database migrations (001_init.sql: PostGIS, users, grid, umkm_report;
│                         #   002_analytics_schema.sql: the real tables the app queries today --
│                         #   spatial_grids, gentrification_risk_scores, umkm_businesses, etc.)
├── .github/workflows/    # CI (lint, build, test on push/PR to main)
├── docker-compose.yml    # Local PostgreSQL + PostGIS for development
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

There are two migrations, applied in order:

- **`001_init.sql`** — the original Fase 0 schema: the `postgis` extension, `user_role`/`report_status` enums, and skeletal `users`, `grid`, and `umkm_report` tables. This is the partner's auth/reporting foundation — don't repurpose or drop the `users` table here without checking with them first.
- **`002_analytics_schema.sql`** — the real tables the app actually queries today (`spatial_grids`, `gentrification_risk_scores`, `policy_recommendations`, `reallocation_candidates`, `umkm_businesses`, `dashboard_summary`, plus the `spatial_grids_geojson` view), matching exactly what titiktemu-analytics' batch pipeline writes. These are a separate concern from `001`'s tables — no foreign keys between the two migrations' tables.

Both are idempotent (`CREATE TABLE IF NOT EXISTS` / `CREATE OR REPLACE VIEW`) and safe to re-run.

- **Local development**: `docker compose up -d` applies both migrations automatically, in filename order, against a fresh volume (see "Start the local database" above).
- **Against a real Supabase project**: create the project in the Supabase dashboard, enable the PostGIS extension under `Database > Extensions`, then run both files against it in order — they're portable between environments:
  ```bash
  psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
  psql "$DATABASE_URL" -f supabase/migrations/002_analytics_schema.sql
  ```
- The `users` table is self-contained (its own UUID primary key, no foreign key to Supabase's `auth.users`) so the same migration works identically against local Docker Postgres and a real Supabase project. Revisit this if the team commits to Supabase Auth as the RBAC identity provider.
- `002`'s tables are also created ad hoc by titiktemu-analytics' `ensure_schema()` (a local-dev convenience for that repo, not the source of truth) -- this migration is the actual source of truth for their shape; keep the two in sync if you change one.
- Keep persistence logic in `src/repositories/` and database client setup in `src/db/`.
- Document any new required variables and migration commands here as they're added.

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
