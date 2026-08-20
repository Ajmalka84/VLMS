# Implementation Plan — Hurdle 11: End-to-End System Hardening, Optimization & Bug Fixes

## Overview
Comprehensive system-wide audit, performance optimization, and bug fixing across the full-stack VLMS architecture. This hurdle resolves edge cases in authentication, eliminates redundant API calls with atomic caching, refines master data management, hardens transaction recording, and polishes the reporting & PDF export pipeline.

---

## Identified Problems & Planned Solutions

### 1. Master Data Bundle & Duplicate API Requests
* **Problem**: 
  - Navigating between tabs caused duplicate `/master-data/bundle` API calls.
  - In React development mode (`StrictMode`) and on uncoordinated component mounts, multiple HTTP requests were fired simultaneously.
  - `MasterDataPage` maintained disconnected local state rather than utilizing the shared cache.
* **Solution**:
  - Implement in-flight Promise deduplication in `frontend/src/api/masterData.ts` so concurrent callers share a single network request.
  - Connect `MasterDataPage` directly to `MasterCacheContext`, enabling instant 0ms cached rendering on tab switch.
  - Implement forced cache refresh (`refreshMasterData(true)`) after any CRUD mutation so all pages (`LoadsPage`, `ReportsPage`, `MasterDataPage`) stay 100% in sync.
  - Skip unnecessary customer bundle queries when authenticated as `SUPER_ADMIN`.

### 2. Authentication, Credential Management & Login Interface
* **Problem**:
  - Super Admin credentials needed updating to production defaults (`ajmalka84@gmail.com` / `05thDec1995`).
  - Login input was restricted to numeric-only 10-digit mobile numbers with regex stripping, blocking email logins for Super Admin.
  - Test helper buttons on `LoginPage.tsx` cluttered the interface.
  - Password reset endpoints were missing for administrative account recovery.
* **Solution**:
  - Update `SUPER_ADMIN_MOBILE` and `SUPER_ADMIN_PASSWORD` in `.env`, `.env.example`, `docker-compose.yml`, and backend auth defaults.
  - Upgrade login field to accept both mobile numbers and email addresses without regex interference.
  - Remove "Quick Test Credentials" demo buttons and optimize button spacing (`mt-6 py-3.5`).
  - Implement backend `POST /api/v1/admin/users/:id/reset-password` and `POST /api/v1/auth/change-password` endpoints.

### 3. Master Data CRUD Integrity & Cascaded Protection
* **Problem**:
  - Deleting sites or vehicle types without checking related rates or loads risked database integrity errors or orphaned records.
  - Indian postal code validation was missing on site registration.
  - Vehicle numbers required consistent uppercase formatting to prevent duplicate entries.
* **Solution**:
  - Implement 6-digit Indian PIN code validation on Sites.
  - Auto-normalize vehicle numbers (`.toUpperCase().trim()`).
  - Implement deletion safety checks in `SitesService`, `VehiclesService`, and `ContractorsService` with descriptive relational error messages.

### 4. Load Entry Dispatch Cockpit & Real-Time Rate HUD
* **Problem**:
  - High-frequency load logging required zero-friction vehicle matching and sticky input memory to reduce operator keystrokes.
  - Soft-deleted loads needed proper exclusion from turnover metrics.
* **Solution**:
  - Implement 4-digit fast vehicle search and recent shuttle tipper chips.
  - Provide live dynamic rate lookup (0ms memory resolver) with manual price override toggle.
  - Store sticky defaults in local storage for repeat dispatch entries.
  - Exclude soft-deleted records (`deletedAt: null`) from active load queries and aggregate calculations.

### 5. Settlement Reports & Vector PDF Generation
* **Problem**:
  - Multiple trip dispatches for the same vehicle/material needed grouping on settlement statements.
  - PDF statements required crisp vector rendering, multi-page layout, and INR amount-to-words conversion.
* **Solution**:
  - Implement trip grouping utility (`tripGrouper.ts`) to consolidate multi-trip vouchers.
  - Add INR currency in words conversion (`numberToWords.ts`).
  - Implement standalone vector PDF generation engine (`pdfGenerator.ts`) utilizing `jspdf` & `jspdf-autotable` with bilingual typography and signature blocks.
  - Refine CSV export with sanitized numerical columns.

---

## Verification Plan

### Automated / Build Verification
```bash
# Verify backend NestJS builds cleanly
cd backend && npm run build

# Verify frontend React / Vite TypeScript build
cd frontend && npm run build

# Verify Docker container runtime
docker compose ps
```

### Functional Scenarios
1. **Super Admin Authentication**: Login with `ajmalka84@gmail.com` / `05thDec1995`.
2. **Customer Authentication**: Login with registered mobile and password.
3. **Master Data Tab**: Click Master Data tab — verify 0 duplicate `/master-data/bundle` network calls.
4. **Load Logging**: Create load with automated rate lookup and price override.
5. **Settlement Report & PDF**: Generate contractor statement, export CSV, and download vector PDF.
