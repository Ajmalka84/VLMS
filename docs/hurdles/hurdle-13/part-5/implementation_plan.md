# Implementation Plan: Hurdle 13 — Part 5: Advanced Financial Reports & Cashflow Subsystem

## Objective
Deliver the complete financial intelligence suite for VLMS:
1. **Site Daily & Monthly Cashflow Statements** (`GET /api/v1/reports/cashflow`).
2. **Co-Partner Temporal Profit-Sharing Settlement Statements** (`GET /api/v1/reports/partner-settlement`).
3. **Heavy Machinery Rental Logbook & Vendor Settlement Statements** (`GET /api/v1/reports/machinery-settlement`).
4. **Enhanced Reports UI (`ReportsPage.tsx`)** with 4 interactive report tabs, live KPI cards, multi-format PDF generation with custom business headers, and CSV data export.

---

## Deliverables & Technical Architecture

### 1. Backend Reports Subsystem

#### `backend/src/reports/reports-cashflow.service.ts`
- Aggregates daily cash inflows (cash loads) and cash outflows (cash drawer expenses and machine advances).
- Returns overall summary KPIs, category-wise outflow breakdown, and daily cashflow timeline items (with opening balance, daily inflows, daily outflows, and closing balance).

#### `backend/src/reports/reports-partner-share.service.ts`
- Evaluates temporal equity slices from `PartnerShare` (`effectiveFrom` to `effectiveTo`).
- Computes site-by-site revenues, operational and heavy machinery expenses, net margins, and equity share amounts for each slice intersecting the selected date range.

#### `backend/src/reports/reports-machinery.service.ts`
- Aggregates machinery rental logs per equipment/vendor.
- Calculates total working hours, daytime/overnight breakdown, gross rental charges, advances disbursed, and net balance payable to machine vendors.

#### `backend/src/reports/reports.controller.ts`
- Add `@Get('cashflow')`, `@Get('partner-settlement')`, and `@Get('machinery-settlement')` with role-based filtering (`OWNER`, `CO_PARTNER`, `SITE_BOY`, `SUPER_ADMIN`).

---

### 2. Frontend Reports Page & API

#### `frontend/src/api/reports.ts`
- Add TypeScript interfaces and API client functions:
  - `getCashflowReportApi(params)`
  - `getPartnerSettlementReportApi(params)`
  - `getMachinerySettlementReportApi(params)`

#### `frontend/src/pages/ReportsPage.tsx`
- Redesign into a modern 4-tab suite:
  1. **Contractor Settlement** (Statement & trip breakdown)
  2. **Site Cashflow Statement** (Daily drawer inflows, outflows, timeline, category breakdown)
  3. **Partner Profit-Sharing** (Temporal equity slices, operating margin, partner dividend breakdown)
  4. **Machinery Rental Logbook** (Equipment logs, hours, gross rent, advances, vendor balance)
- Consistent Dark Slate & Amber aesthetics (`bg-slate-900`, `glass-card`, `border-slate-800`, `amber-500` accents).
- Integrated PDF generation (with custom business header, GSTIN, INR words, sign/stamp box) and CSV export for every tab.

---

## Verification Plan

### Automated Tests
1. **E2E Test Suite (`tests/e2e-system.test.js`)**:
   - Section 13.1: Site Cashflow Report calculation & aggregation test.
   - Section 13.2: Co-Partner Temporal Profit-Sharing calculation across date slices.
   - Section 13.3: Heavy Machinery Rental Logbook & Vendor Settlement balance test.
   - Section 13.4: Role access guard tests (Co-Partner access to own share, Site Boy to assigned site cashflow).
2. **Frontend Production Build**:
   - `npm run build` in `frontend/` to ensure 0 TypeScript or bundling errors.
