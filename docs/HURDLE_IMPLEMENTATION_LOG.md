# VLMS — Hurdle Implementation Log

## Purpose

This is the living handover record for VLMS implementation work.

After each hurdle, append a new section at the end of this file. Record
what was created, the commands and checks used, errors found, root-cause
fixes, the verification result, and the next hurdle. This record is for a
new developer or agent to understand how the project reached its current
state without relying on chat history.

Do not record secrets such as passwords, tokens, or private connection
strings. Use `.env.example` for safe configuration examples.

---

# Hurdle 1 — Project Infrastructure

Status: ✅ Done

Completed: 16-Aug-2026

## Objective

Create a reliable clean-slate development environment with a React/Vite
frontend, NestJS backend, Docker Compose, PostgreSQL, environment templates,
and Git repository metadata.

## Starting State

The workspace initially contained only the VLMS specification documents:

* `PRODUCT_DEFINITION.md`
* `DATABASE_SCHEMA.md`
* `API_DOCUMENTATION.md`
* `DEVELOPMENT_HURDLES.md`
* `AI_AGENT_GUIDELINES.md`

There was no existing application code, Docker configuration, package
configuration, Prisma setup, or Git repository in this workspace.

The older documentation referred to an existing authentication implementation
and backend restart loop. Those references did not apply to this new,
clean-slate repository and were updated after the infrastructure was verified.

## Architecture Created

```text
Browser
  ↓
React + Vite frontend
  ↓
NestJS backend
  ↓
PostgreSQL
```

The project uses npm workspaces:

```text
VLMS/
├── backend/       NestJS application
├── frontend/      React + Vite application
├── docs/          Product and implementation documentation
├── docker-compose.yml
├── package.json   Workspace root
├── package-lock.json
├── .env.example
└── .nvmrc
```

## Files Created

### Root

* `package.json` — npm workspace scripts.
* `package-lock.json` — locked dependency graph.
* `docker-compose.yml` — PostgreSQL, backend, and frontend services.
* `.env.example` — non-secret development environment defaults.
* `.nvmrc` — Node 24 requirement.
* `.gitignore` and `.dockerignore` — excludes generated files and local secrets.

### Backend

* `backend/Dockerfile` — Node 24 Alpine development image.
* `backend/package.json` — NestJS dependencies and scripts.
* `backend/nest-cli.json` — Nest configuration, including clean build output.
* `backend/tsconfig.json` and `backend/tsconfig.build.json` — strict TypeScript configuration.
* `backend/src/main.ts` — CORS, `/api/v1` prefix, and validation setup.
* `backend/src/app.module.ts` and `backend/src/app.controller.ts` — minimal NestJS foundation.

### Frontend

* `frontend/Dockerfile` — Node 24 Alpine development image.
* `frontend/package.json` — React and Vite scripts/dependencies.
* `frontend/vite.config.ts` and TypeScript configuration files.
* `frontend/src/main.tsx`, `styles.css`, and `vite-env.d.ts` — minimal React application.

## Important Design Decisions

* There is one Dockerfile per application service, not a root Dockerfile.
  Docker Compose builds `./backend` and `./frontend` separately, while it
  obtains PostgreSQL from the official image.
* Docker uses Node 24 (`node:24-alpine`). Project engine constraints and
  `.nvmrc` also require Node 24.
* The backend is currently a foundation-only application. `GET /api/v1`
  confirms that it is running. This is not the final health endpoint;
  `GET /api/v1/health` belongs to Hurdle 3.
* The frontend is intentionally not connected to the backend yet. API-client
  integration belongs to Hurdle 4.
* npm workspaces use the default hoisted install strategy. A root
  `node_modules` directory is therefore expected: shared/transitive packages
  are deduplicated there, while workspace-specific packages can remain in
  `backend/node_modules` and `frontend/node_modules`. All `node_modules`
  directories are ignored by Git.

## Commands and Verification Flow

The following are the useful repeatable commands. The local host Node 24
installation was broken, so `/usr/local/bin/node` (Node 22) was used only as
an npm launcher during setup; Docker remains the required Node 24 runtime.

```bash
# Check available runtimes
node --version
npm --version
docker --version
docker compose version

# Install workspace dependencies when the host Node installation is working
npm install

# Build both applications
npm run build

# Validate Compose syntax
docker compose config --quiet

# Build and start the full stack
docker compose up --build --detach

# Inspect service health and logs
docker compose ps
docker compose logs --tail=80 backend frontend postgres

# Verify endpoints
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1
curl --fail --silent --show-error http://127.0.0.1:5173/

# Stop the local stack when it is no longer needed
docker compose down
```

## Errors Encountered and Root-Cause Fixes

The following summarizes important errors encountered during Hurdle 1 and how each was resolved.

- Local Node 24 failed to run
  - Root cause: Missing system library (`libsimdjson.26.dylib`) in the host Node installation.
  - Fix: Switched to Docker Node 24 for runtime and used a working local Node 22 only for npm setup. Host Node 24 should be repaired for non-Docker local runs.

- `npm install` failed to reach the registry
  - Root cause: Network resolution problem in the environment.
  - Fix: Re-ran the install with proper network access; the install succeeded.

- Backend startup error: missing validation packages
  - Root cause: Nest's `ValidationPipe` requires `class-validator` and `class-transformer`.
  - Fix: Added both packages to the backend dependencies.

- Nest CLI incompatible with TypeScript 7
  - Root cause: TypeScript 7 changed the compiler API used by the Nest CLI.
  - Fix: Pinned the backend TypeScript to `^6.0.3` (compatible with the current Nest CLI).

- Backend build errors after TypeScript change
  - Root cause: TypeScript 6 requires explicit `rootDir` and `types`, and rejects the deprecated `baseUrl` option.
  - Fix: Updated `backend/tsconfig.json` (set `rootDir: "./src"`, add `types: ["node"]`, remove `baseUrl`).

- Duplicate compiled artifacts in `dist`
  - Root cause: Old artifacts remained from previous builds.
  - Fix: Enabled `deleteOutDir` in `backend/nest-cli.json` so each build starts with a clean `dist`.

- Local process couldn't bind to port 3000
  - Root cause: Host sandbox blocks listening ports.
  - Fix: Performed short startup checks when permitted; full verification was done via Docker containers.

- First Docker build timed out in the terminal
  - Root cause: Initial image download and dependency installation took longer than the terminal session.
  - Fix: Re-ran the build; cached Docker layers allowed it to complete.

- `git init` blocked initially
  - Root cause: Sandbox restricted writing the `.git` directory.
  - Fix: Re-ran `git init` with appropriate permissions.

Notes:
- Each fix is recorded so future developers can reproduce or re-check the steps.
- No secrets are recorded in this log.

Notes:
- Each fix is recorded so future developers can reproduce or re-check fixes.
- No secrets are recorded in this log.

## Final Verification Result

All Hurdle 1 definition-of-done checks passed.

Summary of verification:

- Frontend: Vite served on port 5173 (OK)
- Backend: NestJS served on port 3000 (OK)
- Docker Compose: PostgreSQL, backend, and frontend containers started (OK)
- PostgreSQL container reported healthy (OK)
- Configuration validated with `docker compose config --quiet` (OK)
- No backend restart loop observed (OK)
- Builds: `npm run build` succeeded for both backend and frontend (OK)
- Git repository initialized and project structure committed (OK)

These checks confirm the project infrastructure (Hurdle 1) is stable and ready for Hurdle 2.

Verified container state:

```text
vlms-postgres-1  → healthy → localhost:5432
vlms-backend-1   → running → localhost:3000
vlms-frontend-1  → running → localhost:5173
```

## Handover Notes

* The Docker stack may remain running after verification. Stop it with
  `docker compose down` when it is not needed.
* Do not add business features while Hurdle 2 is incomplete.
* Do not manually edit `backend/dist`; it is generated and ignored by Git.
* Keep the backend TypeScript version at `^6.0.3` until the installed Nest CLI
  supports TypeScript 7's compiler API.

## Next Hurdle

Hurdle 2 — Database Foundation:

1. Add Prisma to the backend.
2. Configure `DATABASE_URL` for the Compose PostgreSQL service.
3. Translate `DATABASE_SCHEMA.md` into Prisma models without adding
   undocumented tables or fields.
4. Generate Prisma Client.
5. Create and apply the initial migration.
6. Verify PostgreSQL tables and backend database connectivity.

---

# Hurdle 2 — Database Foundation

Status: 🔄 In Progress

## Objective

Establish the Prisma/PostgreSQL data layer described in
`DATABASE_SCHEMA.md`.

## Implementation Record

Append Hurdle 2 work here as it is completed.

---

# Template for Future Hurdles

Copy this section to the end of this file after each completed hurdle.

~~~md
# Hurdle N — Name

Status: ⬜ Not Started | 🔄 In Progress | ✅ Done | 🟡 Blocked

Completed: YYYY-MM-DD

## Objective

## Starting State

## Files Created or Changed

## Commands and Verification Flow

```bash
# Repeatable commands used for this hurdle
```

## Errors Encountered and Root-Cause Fixes

| Error | Root cause | Fix |
|---|---|---|

## Final Verification Result

## Handover Notes

## Next Hurdle
~~~
