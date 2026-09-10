# Titik Temu Backend

TypeScript backend service for Titik Temu. The project currently provides a small Express server foundation and is prepared for a layered API backed by Supabase/PostgreSQL.

> **Project status:** Fase 0 (Setup & Foundation) complete. The layered architecture (routes → controllers → services → repositories) is wired end-to-end through a `GET /api/health` / `GET /api/status` vertical slice, an initial PostGIS schema exists under `supabase/migrations/`, and a mock MAPID adapter contract is in place. Business endpoints (UMKM reports, tenant matching, ESG dashboard, etc.) are not implemented yet.

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
| `DATABASE_URL` | PostgreSQL connection string. Used by `GET /api/status` to report DB connectivity | Yes, for `/api/status` to report `database: "ok"` |
| `CORS_ORIGIN` | Comma-separated allowed browser origins | No. Defaults to `http://localhost:3000`. |

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
│   └── migrations/       # Database migrations (001_init.sql: PostGIS, users, grid, umkm_report)
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

`supabase/migrations/001_init.sql` contains the initial schema: the `postgis` extension, `user_role`/`report_status` enums, and skeletal `users`, `grid`, and `umkm_report` tables. `grid` intentionally holds only geometry for now — Fase 1 will add feature columns (`poi_count`, `ndbi_mean`, `dist_to_station`, etc.), likely as a linked `master_grid_dataset` table rather than more columns here.

- **Local development**: `docker compose up -d` applies this migration automatically against a fresh volume (see "Start the local database" above).
- **Against a real Supabase project**: create the project in the Supabase dashboard, enable the PostGIS extension under `Database > Extensions`, then run the same file against it — it's portable between environments:
  ```bash
  psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
  ```
- The `users` table is self-contained (its own UUID primary key, no foreign key to Supabase's `auth.users`) so the same migration works identically against local Docker Postgres and a real Supabase project. Revisit this if the team commits to Supabase Auth as the RBAC identity provider.
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
