# Implementation Plan — Hurdle 7: Master Data

## Overview
Implement the complete Master Data subsystem for VLMS. This enables customers (`USER`) to configure and manage their operating environment (Sites, Vehicles, Contractors/COs, and the dynamic Rate Matrix based on Site + Vehicle Type + Material Type) with strict multi-tenant data isolation, and allows `SUPER_ADMIN` to manage global Vehicle Types and Material Types. It also includes the crucial Rate Lookup endpoint (`GET /api/v1/rates/lookup`) required for automated load pricing.

## User Review Required
> [!NOTE]
> All plans and walkthroughs will be systematically archived under `docs/hurdles/hurdle-7/` in the repository.

## Proposed Changes

### 1. Backend Master Data Modules
Create modular NestJS controllers, services, and DTOs:

#### A. Vehicle Types (`backend/src/vehicle-types/`)
- Global entity. Read by all authenticated users (`GET /api/v1/vehicle-types`), created/edited/deleted by `SUPER_ADMIN` (`/api/v1/admin/vehicle-types`).
- **`dto/create-vehicle-type.dto.ts`**, **`dto/update-vehicle-type.dto.ts`**
- **`vehicle-types.service.ts`**, **`vehicle-types.controller.ts`**, **`admin-vehicle-types.controller.ts`**, **`vehicle-types.module.ts`**

#### B. Material Types (`backend/src/material-types/`)
- Global entity. Read by all authenticated users (`GET /api/v1/material-types`), created/edited/deleted by `SUPER_ADMIN` (`/api/v1/admin/material-types`).
- **`dto/create-material-type.dto.ts`**, **`dto/update-material-type.dto.ts`**
- **`material-types.service.ts`**, **`material-types.controller.ts`**, **`admin-material-types.controller.ts`**, **`material-types.module.ts`**

#### C. Sites (`backend/src/sites/`)
- Tenant-isolated (`userId = req.user.id`).
- Endpoints: `POST /api/v1/sites`, `GET /api/v1/sites`, `GET /api/v1/sites/:id`, `PATCH /api/v1/sites/:id`, `DELETE /api/v1/sites/:id`.
- **`dto/create-site.dto.ts`**, **`dto/update-site.dto.ts`**
- **`sites.service.ts`**, **`sites.controller.ts`**, **`sites.module.ts`**

#### D. Vehicles (`backend/src/vehicles/`)
- Tenant-isolated (`userId = req.user.id`). References global `vehicleTypeId`. Unique `(userId, vehicleNumber)`.
- Endpoints: `POST /api/v1/vehicles`, `GET /api/v1/vehicles`, `GET /api/v1/vehicles/:id`, `PATCH /api/v1/vehicles/:id`, `DELETE /api/v1/vehicles/:id`.
- **`dto/create-vehicle.dto.ts`**, **`dto/update-vehicle.dto.ts`**
- **`vehicles.service.ts`**, **`vehicles.controller.ts`**, **`vehicles.module.ts`**

#### E. Contractors / COs (`backend/src/contractors/`)
- Tenant-isolated (`userId = req.user.id`).
- Endpoints: `POST /api/v1/contractors`, `GET /api/v1/contractors`, `GET /api/v1/contractors/:id`, `PATCH /api/v1/contractors/:id`, `DELETE /api/v1/contractors/:id`.
- **`dto/create-contractor.dto.ts`**, **`dto/update-contractor.dto.ts`**
- **`contractors.service.ts`**, **`contractors.controller.ts`**, **`contractors.module.ts`**

#### F. Rates & Matrix Lookup (`backend/src/rates/`)
- Tenant-isolated through `site.userId = req.user.id`.
- Unique combination: `(siteId, vehicleTypeId, materialTypeId)`.
- Endpoints:
  - `POST /api/v1/rates`: Creates/updates rate entry with decimal amount.
  - `GET /api/v1/rates`: Lists rates for customer's sites (filterable by `siteId`).
  - `GET /api/v1/rates/lookup?siteId=...&vehicleTypeId=...&materialTypeId=...`: Returns exact rate amount or 404.
  - `GET /api/v1/rates/:id`, `PATCH /api/v1/rates/:id`, `DELETE /api/v1/rates/:id`.
- **`dto/create-rate.dto.ts`**, **`dto/update-rate.dto.ts`**, **`dto/lookup-rate.dto.ts`**
- **`rates.service.ts`**, **`rates.controller.ts`**, **`rates.module.ts`**

#### [MODIFY] [backend/src/app.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/app.module.ts)

---

### 2. Frontend Master Data API Client & UI
- **`frontend/src/api/masterData.ts`**: Comprehensive typed client for Sites, Vehicles, Vehicle Types, Material Types, Contractors, and Rates (including `lookupRateApi`).
- **`frontend/src/pages/MasterDataPage.tsx`**:
  - For **Customer (`USER`)**: Tabbed interface for:
    1. **Sites**: Manage operational sites (Add/Edit/Delete).
    2. **Vehicles**: Manage fleet with vehicle number and vehicle type dropdown.
    3. **Contractors (C/Os)**: Manage contractors with name and mobile.
    4. **Rate Matrix**: Matrix / table view allowing rate configuration for Site + Vehicle Type + Material Type with instant price edit.
  - For **Super Admin (`SUPER_ADMIN`)**: Tabbed interface for:
    1. **Vehicle Types**: Global fleet categorization.
    2. **Material Types**: Global material categorization.
- **`frontend/src/App.tsx`**: Update `/settings` route to render `MasterDataPage`.

#### [NEW] [frontend/src/api/masterData.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/masterData.ts)
#### [NEW] [frontend/src/pages/MasterDataPage.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/pages/MasterDataPage.tsx)
#### [MODIFY] [frontend/src/App.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/App.tsx)

---

### 3. Per-Hurdle Archiving & Tracking
- Save `docs/hurdles/hurdle-7/plan.md`.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 7 as `🔄 In Progress`.

#### [NEW] [docs/hurdles/hurdle-7/plan.md](file:///Users/ajmal/Projects/VLMS/docs/hurdles/hurdle-7/plan.md)
#### [MODIFY] [docs/DEVELOPMENT_HURDLES.md](file:///Users/ajmal/Projects/VLMS/docs/DEVELOPMENT_HURDLES.md)

---

## Verification Plan

### Automated / Command Verification:
1. **Workspace Build:**
   ```bash
   npm run build
   ```
2. **Complete Master Data Lifecycle Test (`Site -> VehicleType -> Vehicle -> MaterialType -> Contractor -> Rate -> Lookup`)**:
   - Super Admin creates global `VehicleType` (`Dumper 10-Wheeler`) and `MaterialType` (`Aggregates 20mm`).
   - Customer User logs in and creates:
     - Site: `Quarry Site Alpha`
     - Vehicle: `KA-01-EQ-1234` with `Dumper 10-Wheeler`
     - Contractor: `Kaveri Transports` (`9845012345`)
     - Rate: `Site Alpha + Dumper 10-Wheeler + Aggregates 20mm = 3500.00`
   - Test Rate Lookup:
     - `GET /api/v1/rates/lookup?siteId=...&vehicleTypeId=...&materialTypeId=...` -> Expect HTTP 200 with amount `3500.00`.
3. **Multi-Tenant Isolation Test**:
   - Create a second customer user.
   - Second customer attempts to read or modify first customer's Site or Rate -> Expect HTTP 404 / 403.
4. **Duplicate Constraint Test**:
   - Attempt creating duplicate rate for same `(Site, VehicleType, MaterialType)` -> Expect HTTP 409 Conflict.
   - Attempt creating duplicate vehicle for same `(User, VehicleNumber)` -> Expect HTTP 409 Conflict.
