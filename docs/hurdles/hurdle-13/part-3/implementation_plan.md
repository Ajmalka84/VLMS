# Hurdle 13 — Part 3: Expenses, Machinery/Hitachi Hours & Advance Engine — Implementation Plan

## Overview
Part 3 establishes the comprehensive Quarry Expense and Heavy Machinery Rental tracking subsystem. This enables Quarry Owners and Site Supervisors to record general daily operating expenses (Diesel, Labour, Explosives, Maintenance, Food, General) across multiple payment modes (`CASH_DRAWER`, `BANK_TRANSFER`, `UPI_ONLINE`, `VENDOR_CREDIT`, `OWNER_DIRECT`), and introduces a precision **Heavy Machinery Hourly Engine** (Hitachi, CAT, JCB, Breakers) with automated overnight 24-hour rollover time calculations, hourly rent calculations, and operator cash advance tracking.

---

## User Review Required

> [!IMPORTANT]
> **Overnight Rollover Calculation**: Quarry operations frequently run excavators and breakers across midnight shifts (e.g. start `22:00` / `10:00 PM` to close `04:30` / `04:30 AM`). The time calculation engine automatically computes:
> $$\text{durationMinutes} = (1440 - \text{startMinutes}) + \text{closeMinutes}$$
> Yielding accurate decimal hours (e.g. 6.50 hrs) multiplied by `rentPerHour`.
>
> **Multi-Mode Cashflow Tracking**:
> - Expenses marked with `CASH_DRAWER` are tracked as direct cash outflows from the weighbridge/site cash box.
> - Expenses marked with `VENDOR_CREDIT` or `BANK_TRANSFER` or `OWNER_DIRECT` are included in quarry site P&L while properly isolated from daily cash drawer reconciliations.

---

## Proposed Changes

### 1. Backend: Expense Categories & Machinery Masters (`backend/src/expenses/`)

#### DTOs:
- `CreateExpenseCategoryDto`: `name: string`.
- `UpdateExpenseCategoryDto`: `name: string`.
- `CreateMachineryDto`: `name: string`, `code?: string`, `defaultRentPerHour?: number`, `vendorName?: string`, `vendorMobile?: string`.
- `UpdateMachineryDto`: `name?: string`, `code?: string`, `defaultRentPerHour?: number`, `vendorName?: string`, `vendorMobile?: string`, `isActive?: boolean`.

#### Controllers & Services:
- `ExpenseCategoriesController` & `ExpenseCategoriesService`: Auto-seeds default categories for tenant if empty (*Diesel, Labour, Explosives/Blasting, Maintenance, Electricity, Food/Tea, General*). CRUD operations scoped to current `ownerId` with relational deletion safeguards.
- `MachineryController` & `MachineryService`: CRUD operations for heavy machinery scoped to `ownerId` with default hourly rates and active toggles.

---

### 2. Backend: Expenses & Heavy Machinery Rental Engine (`backend/src/expenses/`)

#### DTOs:
- `CreateExpenseDto` & `UpdateExpenseDto`:
  - `siteId`: UUID
  - `categoryId`: UUID
  - `date`: `YYYY-MM-DD`
  - `amount`: number (optional if machinery calculation is used)
  - `paymentMode`: `PaymentMode` (`CASH_DRAWER`, `BANK_TRANSFER`, `UPI_ONLINE`, `VENDOR_CREDIT`, `OWNER_DIRECT`)
  - `paidTo?`: string
  - `remarks?`: string
  - `machineryId?`: UUID
  - `startTime?`: string (e.g., `"08:00"`, `"08:00 AM"`, `"22:00"`)
  - `closingTime?`: string (e.g., `"17:30"`, `"05:30 PM"`, `"04:30"`)
  - `startMeterReading?`: number
  - `endMeterReading?`: number
  - `totalHours?`: number (auto-computed if start/close provided)
  - `rentPerHour?`: number
  - `advanceAmount?`: number

#### Service & Controller:
- `ExpensesService` & `ExpensesController`:
  - Time parser & overnight duration calculator: parses 12h/24h strings, handles rollover when `close < start`, calculates `totalHours` and `amount = totalHours * rentPerHour`.
  - `createExpense(ownerId, userId, role, dto)`: Validates site, category, machinery; computes financial totals; creates record.
  - `listExpenses(ownerId, query)`: Dynamic query filtering (`siteId`, `startDate`, `endDate`, `categoryId`, `machineryId`, `paymentMode`) + aggregate calculation (`totalExpenses`, `totalCashDrawerExpenses`, `totalMachineRent`, `totalAdvancesPaid`).
  - `updateExpense(ownerId, userId, role, id, dto)`: Role check (Site Boys restricted to 2-hour window from creation).
  - `deleteExpense(ownerId, id)`: Soft-deletion (`deletedAt`).
- `ExpensesModule`: Registered in `app.module.ts`.
- `MasterDataService`: Enriches atomic master data bundle with tenant `expenseCategories` and `machinery`.

---

### 3. Frontend: API Client & UI Subsystem

#### API Client:
- `frontend/src/api/expenses.ts`: TypeScript interfaces for `Expense`, `ExpenseCategory`, `Machinery`, `ExpenseSummary`, and API methods.

#### UI Components & Pages:
- `frontend/src/pages/ExpensesPage.tsx`:
  - Top KPI Summary Banner (Total Expenses, Cash Drawer Outflows, Machinery Rent, Advances Paid).
  - Multi-dimensional Filter Bar (Date Range picker, Site dropdown, Category filter, Machinery filter, Payment Mode chips).
  - Interactive Modal with Dual Entry Modes:
    1. **General Site Expense Tab**: Category, Site, Amount, Payment Mode, Paid To, Remarks.
    2. **Machinery / Hitachi Hourly Log Tab**: Machine picker (auto-loads default rent), Start & Close Time inputs with live working duration & cost calculator preview, meter readings, operator advance amount, payment mode.
  - Actionable Ledger Table with status chips, time breakdowns, and edit/delete modal triggers.
- `MasterDataPage.tsx`: Add **Expense Categories** and **Machinery Masters** management tabs.
- `App.tsx` & `Header.tsx`: Register `/expenses` route and add **Expenses** navigation item.

---

## Verification Plan

### Automated Tests (`tests/e2e-system.test.js`)
1. **Expense Category Lifecycle**:
   - Auto-seed defaults on initial fetch.
   - Create custom category (e.g. *Security & Watchman*).
2. **Machinery Master Management**:
   - Create heavy machine (*Hitachi EX200*, ₹2,500/hr, Vendor: *ABC Infra*).
3. **General Expense Recording**:
   - Create cash drawer expense (₹4,500 for *Diesel*) and vendor credit expense (₹12,000 for *Explosives*).
4. **Machinery Hourly Engine & Overnight Rollover**:
   - Record daytime rental: `08:00 AM` to `05:30 PM` (9.5 hours @ ₹2,500 = ₹23,750).
   - Record overnight rental: `10:00 PM` to `04:30 AM` (6.5 hours @ ₹3,000 = ₹19,500) with ₹2,000 diesel advance.
5. **Ledger Aggregates & Filtering**:
   - Verify `totalExpenses`, `totalCashDrawerExpenses`, `totalMachineRent`, and `totalAdvancesPaid`.
6. **Soft Deletion & Relational Safeguards**:
   - Soft delete expense and verify exclusion from ledger and summaries.

### Manual Verification
- Log in at http://localhost:5173 as Owner (`9633415164` / `ajmalka84`).
- Open **Expenses** page and record both a general expense and a heavy machinery hourly log.
- Verify live duration calculator updates cost in real-time as start/close times change.
