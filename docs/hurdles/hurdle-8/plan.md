# Implementation Plan — Hurdle 8: Load Management

## Overview
Implement the core transactional capability of VLMS: **Recording Vehicle Loads**.
This includes automatic rate determination based on Site + Vehicle Type + Material Type, optional price overrides, multi-parameter history filtering (by Site, Vehicle, Contractor, Material, Payment Type, Date Range), soft-deletion (`deletedAt`), and a supervisor-first mobile Load Entry console tailored for speed and outdoor usability.

---

## User Review Required
> [!IMPORTANT]
> **Supervisor-First UX Architecture:**
> 1. **Under 10-Second Load Entry:** Site, Material, and Payment Type (Cash/Credit) will use large visual selection chips for 1-tap selection instead of nested dropdowns.
> 2. **Instant Auto-Rate Calculation:** Picking a Vehicle and Material automatically computes and displays the dynamic rate badge (`₹3,500.00`) via `RatesService.lookup`, with an intuitive override toggle if needed.
> 3. **High Legibility:** Optimized contrast and 48px+ tap targets designed for outdoor tablet/mobile phone use at construction & quarry sites.

---

## Proposed Changes

### 1. Backend Loads Module (`backend/src/loads/`)

#### A. DTOs:
- **`dto/create-load.dto.ts`**: Validates `siteId` (UUID), `date` (ISO/YYYY-MM-DD), `vehicleId` (UUID), `materialTypeId` (UUID), `contractorId` (UUID), optional `amount` (number > 0), `paymentType` (enum: `CASH` | `CREDIT`).
- **`dto/update-load.dto.ts`**: Optional `date`, `vehicleId`, `materialTypeId`, `contractorId`, `amount`, `paymentType`.
- **`dto/query-loads.dto.ts`**: `siteId`, `vehicleId`, `contractorId`, `materialTypeId`, `paymentType`, `startDate`, `endDate`, `search`, `page`, `limit`.

#### B. Service (`loads.service.ts`):
- **`create(userId, dto)`**:
  1. Validates `site`, `vehicle`, and `contractor` exist and belong to `userId`.
  2. Resolves `vehicleType` from `vehicle.vehicleTypeId`.
  3. Looks up `Rate` for `(siteId, vehicle.vehicleTypeId, materialTypeId)` where `site.userId === userId`.
  4. If `dto.amount` is provided, uses override amount; otherwise uses `rate.amount`.
  5. If no rate is found and no amount is provided, throws `BadRequestException('No active rate configured for this combination. Please provide a manual amount or configure the rate in Master Data.')`.
  6. Creates `Load` record with `rateId`, `amount`, and `paymentType`.
- **`findAll(userId, query)`**:
  - Filters out soft-deleted records (`deletedAt: null`).
  - Supports filters: `siteId`, `vehicleId`, `contractorId`, `materialTypeId`, `paymentType`, `startDate`, `endDate`, `search` (vehicle number or contractor name).
  - Pagination (`page`, `limit`) and summary aggregates (Total Loads, Total Amount, Total Cash, Total Credit).
- **`findOne(userId, id)`**: Retrieves single load with all relations.
- **`update(userId, id, dto)`**: Updates load details and recalculates rate if vehicle/material/site changed.
- **`remove(userId, id)`**: Soft-deletes load by setting `deletedAt = new Date()`.

#### C. Controller (`loads.controller.ts`):
- `POST /api/v1/loads` (@CurrentUser() user, @Body() dto)
- `GET /api/v1/loads` (@CurrentUser() user, @Query() query)
- `GET /api/v1/loads/:id` (@CurrentUser() user, @Param('id') id)
- `PATCH /api/v1/loads/:id` (@CurrentUser() user, @Param('id') id, @Body() dto)
- `DELETE /api/v1/loads/:id` (@CurrentUser() user, @Param('id') id)

#### D. Module (`loads.module.ts`) & Registration in `app.module.ts`

---

### 2. Frontend Loads API Client & User Interface

#### A. Typed API Client (`frontend/src/api/loads.ts`):
- Interfaces: `Load`, `CreateLoadDto`, `UpdateLoadDto`, `QueryLoadsDto`, `LoadsResponse`.
- Methods: `createLoadApi()`, `getLoadsApi()`, `getLoadByIdApi()`, `updateLoadApi()`, `deleteLoadApi()`.

#### B. Supervisor-First Loads Page (`frontend/src/pages/LoadsPage.tsx`):
- **Two Mode Toggle:**
  1. **⚡ Quick Load Entry Mode (Supervisor Form):**
     - Large visual Site picker chips.
     - Fast Vehicle selector (searchable with vehicle type badge).
     - Material Type selector chips.
     - Contractor (C/O) dropdown.
     - **Live Auto-Rate Indicator:** Shows green badge with auto-resolved rate amount or yellow badge for custom manual override.
     - **Big Payment Type Toggle:** `[ 💵 CASH ]` vs `[ 📝 CREDIT ]` (high-contrast colors).
     - Large, thumb-friendly **"RECORD LOAD"** button.
     - Instant Success Modal / Toast with **"+ Next Truck"** shortcut.
  2. **📋 Load History & Register Mode:**
     - Metric cards: **Total Loads Today**, **Total Volume (₹)**, **Cash Collected**, **Credit Pending**.
     - Filter toolbar: Site, Contractor, Date Range, Payment Type, Search.
     - Load summary table & cards with quick Edit and Soft Delete (with `ConfirmModal`).

#### C. Routing:
- Update `frontend/src/App.tsx` to mount `LoadsPage` on `/loads`.

---

### 3. Per-Hurdle Archiving
- Archive plan in `docs/hurdles/hurdle-8/plan.md`.
- Mark Hurdle 8 as `🔄 In Progress` in `docs/DEVELOPMENT_HURDLES.md`.

---

## Verification Plan

### Automated / Command Verification:
1. **Workspace Build Check:**
   ```bash
   npm run build
   ```
2. **End-to-End Load Transaction Test (`POST /loads -> Auto-Rate -> Amount Override -> History -> Soft Delete`)**:
   - Create customer with Site (`Quarry Alpha`), Vehicle Type (`Dumper 10W`), Vehicle (`KL-07-CD-1234`), Material (`M-Sand`), Contractor (`Kaveri Transports`), and Rate (`3500.00`).
   - Test 1: Record load without amount -> Verify amount is auto-populated as `3500.00`.
   - Test 2: Record load with amount override `4000.00` -> Verify amount saved is `4000.00`.
   - Test 3: Record load with `paymentType: "CASH"` and another with `"CREDIT"`.
   - Test 4: Query `GET /loads?siteId=...` -> Verify both loads returned.
   - Test 5: Soft-delete a load -> Verify `GET /loads` excludes it from list.
   - Test 6: Cross-tenant isolation -> Customer 2 cannot see or record loads against Customer 1's sites/vehicles.
