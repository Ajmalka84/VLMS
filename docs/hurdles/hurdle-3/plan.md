# Implementation Plan — Hurdle 3: Backend Foundation

## Overview
Establish a robust, standardized NestJS API foundation for VLMS before building business modules. This includes global prefixing and versioning (`/api/v1`), unified exception filters, response transformation interceptors conforming to `docs/API_DOCUMENTATION.md`, global validation pipes, and a comprehensive database-aware health check endpoint (`GET /api/v1/health`).

## User Review Required
> [!NOTE]
> All plans and walkthroughs will be systematically archived under `docs/hurdles/hurdle-<N>/` starting with this hurdle.

## Proposed Changes

### 1. Common Layer: Exception Handling & Response Formatting
Create standard formatting utilities in `backend/src/common/`:
- **`filters/all-exceptions.filter.ts`**: Catches NestJS `HttpException` and uncaught exceptions, producing the standard error structure:
  ```json
  {
    "success": false,
    "message": "Descriptive message",
    "code": "ERROR_CODE"
  }
  ```
  Properly extracts validation error messages from `class-validator` arrays.
- **`interceptors/response.interceptor.ts`**: Intercepts successful controller responses and ensures standard wrapping:
  ```json
  {
    "success": true,
    "data": ...
  }
  ```
- **`common.module.ts`**: Registers global filter, global interceptor, and validation pipes via NestJS dependency injection (`APP_FILTER`, `APP_INTERCEPTOR`).

#### [NEW] [backend/src/common/filters/all-exceptions.filter.ts](file:///Users/ajmal/Projects/VLMS/backend/src/common/filters/all-exceptions.filter.ts)
#### [NEW] [backend/src/common/interceptors/response.interceptor.ts](file:///Users/ajmal/Projects/VLMS/backend/src/common/interceptors/response.interceptor.ts)
#### [NEW] [backend/src/common/common.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/common/common.module.ts)

---

### 2. Health Check Module
Create `backend/src/health/` with:
- **`health.service.ts`**: Executes a lightweight query (`$queryRaw\`SELECT 1\``) through `PrismaService` and measures response time and uptime.
- **`health.controller.ts`**: Exposes `GET /health` (available at `/api/v1/health` via the global prefix).
- **`health.module.ts`**: Bundles health controller and service.

#### [NEW] [backend/src/health/health.service.ts](file:///Users/ajmal/Projects/VLMS/backend/src/health/health.service.ts)
#### [NEW] [backend/src/health/health.controller.ts](file:///Users/ajmal/Projects/VLMS/backend/src/health/health.controller.ts)
#### [NEW] [backend/src/health/health.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/health/health.module.ts)

---

### 3. Application Module Configuration
- Update `backend/src/app.module.ts` to import `CommonModule` and `HealthModule`.
- Keep `backend/src/main.ts` clean with CORS, `/api/v1` global prefix, and standard shutdown hooks.

#### [MODIFY] [backend/src/app.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/app.module.ts)
#### [MODIFY] [backend/src/main.ts](file:///Users/ajmal/Projects/VLMS/backend/src/main.ts)

---

### 4. Per-Hurdle Documentation Archiving
- Create `docs/hurdles/hurdle-3/plan.md` to persist this plan directly in the repository.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 3 as `🔄 In Progress`.

#### [NEW] [docs/hurdles/hurdle-3/plan.md](file:///Users/ajmal/Projects/VLMS/docs/hurdles/hurdle-3/plan.md)
#### [MODIFY] [docs/DEVELOPMENT_HURDLES.md](file:///Users/ajmal/Projects/VLMS/docs/DEVELOPMENT_HURDLES.md)

---

## Verification Plan

### Automated / Command Verification:
1. **NestJS Build:**
   ```bash
   npm run build --workspace=@vlms/backend
   ```
2. **Health Check Endpoint (`GET /api/v1/health`):**
   ```bash
   curl -i http://localhost:3000/api/v1/health
   ```
   *Expected:* HTTP 200 with `{ "success": true, "data": { "status": "ok", "database": { "status": "up" }, ... } }`.
3. **Validation & Exception Handling Test:**
   Send an invalid request to test standard error formatting:
   ```bash
   curl -i http://localhost:3000/api/v1/non-existent
   ```
   *Expected:* HTTP 404 with `{ "success": false, "message": "Cannot GET /api/v1/non-existent", "code": "NOT_FOUND" }`.
4. **Database Resilience Test:**
   Temporarily stop Postgres container to verify graceful health degradation:
   ```bash
   docker compose stop postgres
   curl -i http://localhost:3000/api/v1/health
   docker compose start postgres
   ```
   *Expected:* HTTP 503 with database status `"down"`.
