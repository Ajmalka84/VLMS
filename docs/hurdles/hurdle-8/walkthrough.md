# Walkthrough — Hurdle 8: Load Management & Supervisor Dispatch Cockpit

## Status: ✅ Completed

Hurdle 8 implemented the core transactional engine of VLMS: recording vehicle loads on-site with automatic rate matrix resolution, manual price overrides, Cash vs Credit settlement flags, comprehensive history register queries with real-time aggregate summaries, soft-deletions, and a mobile-first interface optimized for site supervisors in outdoor quarry/construction conditions.

---

## 1. Components Implemented

### Backend Loads Module (`LoadsModule`)
* **Load Recording Transaction (`POST /api/v1/loads`)**:
  * Validates tenant ownership of Site, Fleet Vehicle, and Contractor.
  * Resolves `vehicleType` from the vehicle and calls the dynamic Rate Lookup engine for `(Site + Vehicle Type + Material Type)`.
  * If no manual `amount` is passed, auto-populates the resolved rate amount (`rate.amount`).
  * If a manual override `amount` is passed, records the custom amount while linking the matrix rate relation.
  * Supports `paymentType` (`CASH` | `CREDIT`) and custom or default dispatch dates.
* **Load Register & Filter Engine (`GET /api/v1/loads`)**:
  * Filters out soft-deleted records (`deletedAt: null`).
  * Supports multi-parameter filtering: Site, Vehicle, Contractor, Material Type, Payment Type, Date Range, and Search text.
  * Returns paginated load records alongside real-time summary aggregates:
    * `totalLoads`
    * `totalAmount`
    * `totalCashAmount` & `cashCount`
    * `totalCreditAmount` & `creditCount`
* **Load Updates & Soft Deletes (`PATCH /loads/:id`, `DELETE /loads/:id`)**:
  * Allows updating load amounts, payment types, dates, and contractors.
  * Implements soft delete by stamping `deletedAt = new Date()`, ensuring historical auditability without foreign key constraint violations.

### Frontend Architecture & Enhancements
* **Bilingual Localization System (`LanguageContext`)**:
  * Header toggle: `[ EN | മലയാളം ]` with instant, reactive UI translation.
  * Stores language preference in `localStorage`.
  * Contextual translations for all logistics and quarry terms.
* **Touch-First Dispatch Cockpit (`LoadsPage.tsx`)**:
  * **Smart Defaults & Sticky Memory**: Auto-selects single site; remembers previous site, material, and contractor selections.
  * **4-Digit Quick Vehicle Search**: Instant numeric filter (e.g. typing `5555` or `1234`).
  * **Recent Shuttle Fleet Chips**: 1-tap chips for repetitive shuttle tippers.
  * **Compact Date Row**: Defaults to Today with expandable date selector.
  * **Live Rate HUD & Payment Toggle**: Dynamic green rate badge (`₹4,500.00`) with 1-tap manual override and 52px high-contrast `[ 💵 CASH ]` / `[ 📝 CREDIT ]` buttons.
  * **Massive Dispatch Button**: 56px thumb-zone submit button with micro-animations.
* **Custom Glassmorphism Dropdowns (`CustomSelect`)**:
  * Replaced browser/macOS native `<select>` menus with sleek dark glassmorphism dropdowns featuring integrated search, sublabels, and icons.
* **Fixed Viewport Floating Toast System (`ToastContext`)**:
  * Notifications float fixed at the top of the viewport (`fixed top-5 z-50`), remaining visible at all scroll positions on mobile.
  * Includes mobile haptic vibration (`navigator.vibrate`) on validation alerts.

---

## 2. Verification Evidence

### 1. Load Creation with Auto-Rate Resolution
```bash
POST /api/v1/loads
{
  "siteId": "7a36cf9c-4124-4d0f-943a-566c5a0f541f",
  "vehicleId": "d988cc79-b099-40ca-b16d-6ead28507167",
  "materialTypeId": "2b180098-9c29-452a-a359-9b0649ce1b18",
  "contractorId": "f85b0d95-1c3b-4a3b-a5f4-20e4dd4083cb",
  "paymentType": "CREDIT"
}
```
```json
{
  "success": true,
  "data": {
    "id": "19df3e9b-02d8-487b-8e7c-54d0e6669d18",
    "amount": "4500",
    "paymentType": "CREDIT",
    "rateId": "05184490-ba40-4a5d-96ab-c3c28267c1d6",
    "site": { "siteName": "Express Highway Quarry" },
    "vehicle": { "vehicleNumber": "KA-04-AB-5555", "vehicleType": { "name": "Dumper 10-Wheeler" } },
    "materialType": { "name": "Aggregates 20mm" },
    "contractor": { "name": "Southern Earthmovers Ltd" }
  }
}
```

### 2. Load Creation with Manual Override & CASH
```bash
POST /api/v1/loads
{
  "siteId": "...",
  "vehicleId": "...",
  "materialTypeId": "...",
  "contractorId": "...",
  "amount": 4200.00,
  "paymentType": "CASH"
}
```
* Recorded successfully with `amount: 4200` and `paymentType: CASH`.

### 3. Load Register Summary & Aggregates
```json
{
  "totalLoads": 2,
  "totalAmount": 8700,
  "totalCashAmount": 4200,
  "totalCreditAmount": 4500,
  "cashCount": 1,
  "creditCount": 1
}
```

### 4. Soft Delete Verification
* Deleted load is stamped with `deletedAt` and excluded from subsequent `GET /api/v1/loads` queries.
* Cross-tenant access attempt by Tenant 2 rejected with **HTTP 403 Forbidden**.

---

## 3. Handover & Next Hurdle
Load management and the supervisor dispatch cockpit are complete and fully operational. We are now ready to proceed to **Hurdle 9 — Settlement Reports** (aggregating contractor load history into C/O settlement statements, date range breakdowns, and PDF exports).
