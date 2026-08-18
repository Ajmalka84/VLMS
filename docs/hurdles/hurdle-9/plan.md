# Implementation Plan — Hurdle 9: Settlement Reports (C/O Contractor Reports)

## Overview
Implement the financial settlement and reporting engine of VLMS: **Contractor (C/O) Settlement Statements**.
This allows quarry owners and transport operators to generate accurate billing summaries for contractors over arbitrary date ranges, view trip breakdowns, analyze material/vehicle subtotals, review Cash vs Credit balances, and export/print official settlement statements (PDF & CSV).

---

## User Review Required
> [!IMPORTANT]
> **Real-World Settlement Architecture (കണക്ക് / C/O Settlement Sheet):**
> 1. **Contractor Summary Hub:** Displays all active contractors with their trip count, cash paid, credit outstanding, and net settlement balance.
> 2. **Detailed Settlement Statement (`/reports/settlement`):**
>    - **Financial Summary**: Total Trips, Total Turnover, Cash Collected, Credit Payable.
>    - **Material Subtotals**: Breakdown by material (e.g. *M-Sand: 15 trips — ₹52,500, 20mm Metal: 8 trips — ₹36,000*).
>    - **Vehicle Subtotals**: Breakdown by truck number.
>    - **Itemized Trip Log**: Chronological listing of every dispatch.
> 3. **Printable / PDF Format & CSV Export:**
>    - `@media print` optimized A4 layout with clean invoice header, business name, contractor details, summary tables, and signature lines for physical voucher printing.
>    - 1-Click CSV / Spreadsheet download for Excel accounting.
>    - Full bilingual support (English ⟷ മലയാളം).

---

## Proposed Changes

### 1. Backend Reports Module (`backend/src/reports/`)

#### A. DTOs:
- **`dto/query-settlement.dto.ts`**:
  - `contractorId` (UUID, required)
  - `startDate` (optional string YYYY-MM-DD)
  - `endDate` (optional string YYYY-MM-DD)
  - `siteId` (optional UUID)
  - `paymentType` (optional enum: `CASH` | `CREDIT`)
- **`dto/query-contractor-summary.dto.ts`**:
  - `startDate` (optional)
  - `endDate` (optional)
  - `siteId` (optional)
  - `search` (optional)

#### B. Service (`reports.service.ts`):
- **`getContractorsSummary(userId, query)`**:
  - Aggregates all non-deleted loads for the tenant's contractors.
  - Groups by contractor: Contractor details, Total Trips, Total Amount, Cash Trips & Amount, Credit Trips & Amount.
- **`getSettlementStatement(userId, query)`**:
  - Validates contractor belongs to `userId`.
  - Queries all loads for `contractorId` within the date range and optional site/payment filter (`deletedAt: null`).
  - Computes:
    - Overall summary (`totalTrips`, `totalAmount`, `cashTrips`, `cashAmount`, `creditTrips`, `creditAmount`).
    - Material breakdown (trips and amounts grouped by material type).
    - Vehicle breakdown (trips and amounts grouped by vehicle number).
    - Chronological itemized trip list with date, vehicle, material, site, rate, amount, paymentType.

#### C. Controller (`reports.controller.ts`):
- `GET /api/v1/reports/settlement` (@CurrentUser() user, @Query() query: QuerySettlementDto)
- `GET /api/v1/reports/contractors-summary` (@CurrentUser() user, @Query() query: QueryContractorsSummaryDto)

#### D. Module (`reports.module.ts`) & Registration in `app.module.ts`

---

### 2. Frontend Reports Hub & Settlement Viewer

#### A. Typed API Client (`frontend/src/api/reports.ts`):
- Interfaces: `SettlementReport`, `ContractorSummary`, `MaterialBreakdown`, `VehicleBreakdown`, `TripItem`.
- Methods: `getContractorsSummaryApi()`, `getSettlementReportApi()`.

#### B. Reports & Settlement Page (`frontend/src/pages/ReportsPage.tsx`):
- **View 1: All Contractors Overview (C/O Summary Hub)**:
  - KPI Cards: Total Settled Contractors, Total Trips, Aggregate Credit Outstanding.
  - Contractor cards/table with quick filters and 1-click **"Generate Statement (കണക്ക് എടുക്കുക)"** button.
- **View 2: Contractor Settlement Statement (Detailed Billing Sheet)**:
  - Top Filter Bar: Quick Date Range buttons (Today, Yesterday, This Week, This Month, Custom Range), Site filter, Payment filter.
  - **Financial Summary Cards**: Total Trips, Total Amount, Cash Received, **Net Credit Balance**.
  - **Material & Fleet Distribution**: Visual summary chips of material volumes.
  - **Itemized Dispatch Register**: Clean tabular view of all trips.
  - **Export Actions**:
    - **🖨️ Print / Save PDF**: Triggers browser print dialog formatted with official A4 invoice header, contractor signature blocks, and clean styling.
    - **📥 Export CSV**: Generates formatted CSV file for download.

#### C. Routing:
- Update `frontend/src/App.tsx` to mount `ReportsPage` on `/reports`.

---

### 3. Per-Hurdle Archiving
- Archive plan in `docs/hurdles/hurdle-9/plan.md`.
- Mark Hurdle 9 as `🔄 In Progress` in `docs/DEVELOPMENT_HURDLES.md`.

---

## Verification Plan

### Automated / Command Verification:
1. **Workspace Build Check:**
   ```bash
   npm run build
   ```
2. **End-to-End Reports Test Script (`test-reports.js`)**:
   - Customer with 2 contractors, multiple recorded loads (Cash and Credit, multiple materials, multiple vehicles).
   - Test 1: Query `GET /reports/contractors-summary` -> Verify contractor trip counts and sum of credit matches database.
   - Test 2: Query `GET /reports/settlement?contractorId=...` -> Verify exact total trips, total amount, cash/credit sums, material breakdown, and itemized trip list.
   - Test 3: Date range filter (`startDate` & `endDate`) -> Verify loads outside the range are excluded.
   - Test 4: Tenant isolation -> Customer 2 cannot generate reports for Customer 1's contractors (HTTP 403 / 404).
