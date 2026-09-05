# Titik Temu Backend

TypeScript backend service for Titik Temu. The project currently provides a small Express server foundation and is prepared for a layered API backed by Supabase/PostgreSQL.

> **Project status:** early development. At the moment, the application exposes only `GET /` and responds with `Hello World!`. The application layers and database migration directory are scaffolded but do not contain implementation yet.

## Requirements

- Node.js 20 or newer
- pnpm 10.15.0 (the version declared by `packageManager`)
- A Supabase project, when database or Supabase integrations are added

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
| `PORT` | HTTP port for the API | No. The current entrypoint listens on `3000` until port configuration is wired in. |
| `NODE_ENV` | Runtime environment name | No |
| `SUPABASE_URL` | Supabase project URL | Not by the current endpoint |
| `SUPABASE_ANON_KEY` | Supabase public/anonymous API key | Not by the current endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side key | Not by the current endpoint; keep private |
| `DATABASE_URL` | PostgreSQL connection string, intended for the Supabase transaction pooler | Not by the current endpoint |
| `CORS_ORIGIN` | Comma-separated allowed browser origins | Not by the current endpoint |

The values in `.env.example` are placeholders. Replace them before enabling database or Supabase-backed features.

### 3. Run the development server

```bash
pnpm dev
```

The development command runs `src/index.ts` through `tsx` and watches for changes. With the current implementation, verify the server at:

```text
http://localhost:3000/
```

Expected response:

```text
Hello World!
```

### 4. Build and run production output

```bash
pnpm build
pnpm start
```

`pnpm build` compiles TypeScript from `src/` into `dist/`, including source maps and declaration files. `pnpm start` runs `dist/index.js` with Node.js.

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the watch-mode development server with `tsx` |
| `pnpm build` | Type-check and compile the project into `dist/` |
| `pnpm start` | Run the compiled production entrypoint |

There are currently no test or lint scripts configured in `package.json`.

## Current API

| Method | Path | Description | Response |
| --- | --- | --- | --- |
| `GET` | `/` | Basic server smoke check | `Hello World!` |

The server currently listens on port `3000` directly in `src/index.ts`. Although `PORT=4000` exists in `.env.example`, environment-based port configuration has not yet been connected to the entrypoint.

## Project structure

```text
.
├── src/
│   ├── index.ts          # Application entrypoint and current HTTP route
│   ├── config/           # Configuration and environment parsing
│   ├── controllers/      # HTTP request/response handlers
│   ├── db/               # Database and Supabase client setup
│   ├── middleware/       # Express middleware such as security and auth
│   ├── repositories/     # Persistence and database access layer
│   ├── routes/           # Route and router registration
│   ├── services/         # Application and domain business logic
│   └── validators/       # Request and response validation schemas
├── supabase/
│   └── migrations/       # Database migrations; currently empty
├── .env.example          # Environment variable template
├── .gitignore            # Ignored local files and dependencies
├── package.json          # Scripts, dependencies, and package metadata
├── pnpm-lock.yaml        # Locked dependency versions
├── tsconfig.json         # TypeScript compiler configuration
└── README.md             # Project documentation
```

The `src/` subdirectories describe the intended ownership boundaries. New endpoints should normally flow through `routes` -> `controllers` -> `services` -> `repositories`, with validation and cross-cutting behavior handled by `validators` and `middleware`. Keep database-specific details inside `db` and `repositories` so controllers remain focused on HTTP concerns.

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

### Development dependencies

| Package | Role |
| --- | --- |
| `typescript` | Static type checking and compilation |
| `tsx` | Running TypeScript directly during development |
| `eslint` | JavaScript/TypeScript linting; no project lint script is configured yet |
| `@types/express`, `@types/cors`, `@types/node` | TypeScript declarations |

## TypeScript configuration

The project uses strict TypeScript checking with NodeNext module resolution and ECMAScript 2022 output. Source files live under `src/`; compiled files are emitted under `dist/`. Generated build output should not be committed.

Run the compiler without emitting files when checking a change:

```bash
npx tsc --noEmit
```

## Database and Supabase

Supabase-related dependencies and environment placeholders are already included, but no database client wiring or migration has been committed yet. When database work begins:

1. Add migrations under `supabase/migrations/`.
2. Keep credentials in local or deployment environment configuration.
3. Use the transaction pooler connection string for `DATABASE_URL` as indicated by the template.
4. Keep persistence logic in `src/repositories/` and database client setup in `src/db/`.
5. Document any new required variables and migration commands here.

## Development conventions

- Use the existing TypeScript and ESM configuration.
- Validate untrusted request data at the API boundary with Zod schemas.
- Keep controllers thin and move business rules into services.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser clients.
- Add or update focused tests as soon as endpoint behavior is introduced.
- Run `pnpm build` (or `npx tsc --noEmit`) before opening a pull request.

## Contributing

1. Create a focused branch from the current default branch.
2. Install dependencies with `pnpm install`.
3. Copy `.env.example` to `.env` and configure only the values needed for your work.
4. Make a focused change and update the documentation when setup or behavior changes.
5. Run the available validation commands:

	```bash
	pnpm build
	```

6. Open a pull request describing the change, verification performed, environment variables added, and any migration required.
