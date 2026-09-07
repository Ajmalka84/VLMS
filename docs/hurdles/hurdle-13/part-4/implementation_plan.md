# Hurdle 13 — Part 4: Role-Based App Experience, Site Boy Field Workflow & Shift Drawer Engine

## Problem & Context
In quarry and earthmoving operations, three distinct user personas interact with the system simultaneously:
1. **Quarry Owner**: Full administrative control across all sites, rates, team members, expenses, and financial ledgers.
2. **Co-Partner**: Joint venture partner who needs multi-site visibility, dashboard KPIs, and profit-sharing reports strictly for their assigned quarry sites.
3. **Site Boy (Field Supervisor)**: Gate operator stationed at a single quarry weighbridge/entry point. Needs a simplified, mobile-first field workflow locked to their assigned site, capability to quickly register unexpected tipper trucks and contractors, 2-hour load/expense edit boundaries, and day-end cash drawer reconciliation and handover.

---

## Proposed Changes

### 1. Backend Shifts & Cash Drawer Reconciliation Subsystem
Create `backend/src/shifts/` module with database entities, service, and controller:
- **`ShiftDrawer` Prisma Model**:
  - `id`, `ownerId`, `siteId`, `siteBoyId`, `shiftDate`, `openedAt`, `closedAt`
  - `openingCashBalance` (Decimal)
  - `spotCashLoadsTotal` (Decimal)
  - `cashExpensesTotal` (Decimal)
  - `machineryAdvancesTotal` (Decimal)
  - `expectedCash` (Decimal)
  - `actualCashHandover` (Decimal)
  - `discrepancy` (Decimal: actual - expected)
  - `notes`, `status` (`OPEN`, `CLOSED_PENDING_APPROVAL`, `APPROVED`), `approvedBy`
- **Endpoints**:
  - `GET /api/v1/shifts/current-drawer?siteId=...`: Computes live opening balance, cash collected from loads, cash disbursed in expenses/advances, and expected drawer balance.
  - `POST /api/v1/shifts/close`: Submits shift handover with actual counted cash and discrepancy.
  - `PATCH /api/v1/shifts/:id/approve`: Owner approves shift handover and rolls forward closing cash to next day's opening balance.
  - `GET /api/v1/shifts/history`: Scoped shift audit history.

### 2. Backend Security & Role Guard Hardening
- **Loads Controller (`backend/src/loads/`)**:
  - Enforce site-locking: Site Boys can only create/read loads for their `assignedSiteId`.
  - Enforce 2-hour edit window for Site Boys on loads (matching expenses).
  - Block load deletion (`DELETE /api/v1/loads/:id`) for Site Boys and Co-Partners (`@Roles('OWNER', 'SUPER_ADMIN')`).
- **Master Data Controller (`backend/src/master-data/`)**:
  - Allow Site Boys to create `Vehicle` and `Contractor` records (scoped to `ownerId`), while blocking site and rate creation/deletion.

### 3. Frontend Role-Based Navigation & UI Adaptation
- **Navigation (`frontend/src/components/layout/AppLayout.tsx`)**:
  - Tailor navigation tabs per role:
    - **`SUPER_ADMIN`**: Customers (`/admin/users`), Global Reports (`/reports`).
    - **`OWNER`**: Dashboard (`/dashboard`), Loads (`/loads`), Expenses (`/expenses`), Reports (`/reports`), Master Data (`/master-data`).
    - **`CO_PARTNER`**: Dashboard (`/dashboard`), Reports (`/reports`).
    - **`SITE_BOY`**: Loads (`/loads`), Expenses (`/expenses`), Masters (`/master-data` - Vehicles/Contractors only), Shift Drawer (`/shift-drawer`).
  - Add active role badge in top header with site designation (e.g. `Site Supervisor: Chengara Quarry`).
- **Loads & Expenses UI Lockdown for Site Boy**:
  - In `LoadsPage.tsx` & `ExpensesPage.tsx`, auto-lock site selector to `assignedSiteId` with a disabled badge (e.g. `🔒 Chengara Quarry (Locked)`).
  - Hide delete buttons and restrict edits older than 2 hours.
- **Shift Drawer UI (`frontend/src/pages/ShiftDrawerPage.tsx`)**:
  - Live cash breakdown card (Opening + Spot Cash - Cash Expenses - Machine Advances = Expected In Drawer).
  - Cash denomination / actual count input.
  - Handover recipient and notes.
  - 1-Tap "Submit Shift Handover" with instant discrepancy highlighting.
  - Owner review and approval tab.

---

## Verification Plan

### Automated Tests
- Add E2E tests covering:
  - Site Boy site-locking on Load & Expense creation.
  - Site Boy blocked from deleting loads or accessing unassigned sites.
  - 2-hour edit window enforcement for loads.
  - Current drawer live computation & shift closure.
  - Owner shift approval and balance roll-forward.
- Run `npm test` (all tests passing).

### Manual Verification
- Log in as Site Boy (`9112233446` / `password123`).
- Verify navigation shows only permitted tabs.
- Record load & verify site is pre-locked.
- Open Shift Drawer, verify live balance math, enter actual cash, close shift.
- Log in as Owner (`9633415164`), review and approve the closed shift.
