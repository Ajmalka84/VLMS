# Walkthrough — Hurdle 7: Master Data

## Status: ✅ Completed

Hurdle 7 established the complete Master Data subsystem and rate determination engine for VLMS, enabling customers (`USER`) to configure operational sites, fleet vehicles, C/O contractors, and the dynamic Rate Matrix (Site + Vehicle Type + Material Type = Rate Amount) with strict tenant isolation, and allowing `SUPER_ADMIN` to configure global vehicle types and material types.

---

## 1. Components Implemented

### Backend Modules
* **Vehicle Types (`backend/src/vehicle-types/`)**:
  * `GET /api/v1/vehicle-types`: Authenticated read access for dropdowns.
  * `POST`, `PATCH`, `DELETE /api/v1/admin/vehicle-types`: Super Admin CRUD.
* **Material Types (`backend/src/material-types/`)**:
  * `GET /api/v1/material-types`: Authenticated read access for dropdowns.
  * `POST`, `PATCH`, `DELETE /api/v1/admin/material-types`: Super Admin CRUD.
* **Sites (`backend/src/sites/`)**:
  * Tenant-isolated CRUD (`POST /sites`, `GET /sites`, `GET /sites/:id`, `PATCH /sites/:id`, `DELETE /sites/:id`).
* **Vehicles (`backend/src/vehicles/`)**:
  * Tenant-isolated fleet management (`POST /vehicles`, `GET /vehicles`, `GET /vehicles/:id`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id`).
  * Enforces unique `(userId, vehicleNumber)`.
* **Contractors / C/Os (`backend/src/contractors/`)**:
  * Tenant-isolated contractor management (`POST /contractors`, `GET /contractors`, `GET /contractors/:id`, `PATCH /contractors/:id`, `DELETE /contractors/:id`).
* **Rates & Rate Lookup Engine (`backend/src/rates/`)**:
  * Dynamic rate matrix linking **Site + Vehicle Type + Material Type**.
  * Enforces unique `(siteId, vehicleTypeId, materialTypeId)`.
  * `GET /api/v1/rates/lookup?siteId=...&vehicleTypeId=...&materialTypeId=...`: Returns active rate amount or 404.

### Frontend Master Data Hub (`MasterDataPage.tsx`)
* **For Customer (`USER`)**:
  * **Sites Tab**: Create/edit/delete operational sites with location & pincode.
  * **Fleet Vehicles Tab**: Create/edit/delete vehicles with category selector and uppercase formatting.
  * **Contractors Tab**: Create/edit/delete C/O contractors with mobile validation.
  * **Rate Matrix Tab**: Configure dynamic load pricing per Site + Vehicle Type + Material Type with instant price edit modal.
* **For Super Admin (`SUPER_ADMIN`)**:
  * **Vehicle Types Tab**: Configure global vehicle categories (Dumper 10-Wheeler, Tipper 6-Wheeler, etc.).
  * **Material Types Tab**: Configure global material types (Aggregates 20mm, M-Sand, GSB, etc.).

---

## 2. Verification Evidence

### 1. Master Data Creation Flow
```bash
# Customer creates Site
POST /api/v1/sites -> { "siteName": "Quarry Alpha", "location": "Bangalore North", "pincode": "560064" }

# Customer creates Vehicle
POST /api/v1/vehicles -> { "vehicleNumber": "KA-01-EQ-9857", "vehicleTypeId": "<UUID>" }

# Customer creates Contractor
POST /api/v1/contractors -> { "name": "Kaveri Transports", "mobile": "9845012345" }

# Customer configures Rate
POST /api/v1/rates -> { "siteId": "<SITE_ID>", "vehicleTypeId": "<VTYPE_ID>", "materialTypeId": "<MTYPE_ID>", "amount": 3500.00 }
```

### 2. Automated Rate Lookup
```bash
GET /api/v1/rates/lookup?siteId=<SITE_ID>&vehicleTypeId=<VTYPE_ID>&materialTypeId=<MTYPE_ID>
```
```json
{
  "success": true,
  "data": {
    "id": "c0eed182-e5f6-4b64-94be-e1dce9a8edd2",
    "amount": "3500",
    "site": { "siteName": "Quarry Alpha" },
    "vehicleType": { "name": "Dumper 10-Wheeler" },
    "materialType": { "name": "Aggregates 20mm" }
  }
}
```

### 3. Tenant Isolation & Duplicate Constraints
* Second customer attempting to view first customer's site: **HTTP 403 Forbidden**.
* Second customer attempting to lookup rate on first customer's site: **HTTP 404 Not Found**.
* Attempting to register existing vehicle number for the same customer: **HTTP 409 Conflict**.

---

## 3. Handover & Next Hurdle
Master data configuration is fully verified and ready. We are now ready to proceed to **Hurdle 8 — Load Management** (recording vehicle loads with automatic rate resolution and optional overrides).
