# Hurdle 13 — Part 3: Expenses, Machinery/Hitachi Hours & Advance Engine — Walkthrough

## 1. Overview
Hurdle 13 Part 3 establishes the complete Quarry Expense and Heavy Machinery Rental tracking subsystem:
1. **Expense Categories & Machinery Masters**:
   - **Expense Categories**: Auto-seeds 7 system default heads (*Diesel, Labour & Wages, Explosives & Blasting, Vehicle / Machinery Maintenance, Electricity & Power, Food & Refreshments, General Site Expenses*) for every tenant on first fetch, while allowing owners to add custom heads (e.g. *Security & Night Watchman*).
   - **Heavy Machinery**: Registry for excavators, JCBs, breakers, and cranes (*Hitachi EX 210, CAT 320, JCB 3DX*) with machine code tags, default hourly rental rates, and vendor contact info.
2. **Heavy Machinery Hourly Engine & Overnight Rollover**:
   - Time parser supports both 12-hour AM/PM and 24-hour formats (e.g. `08:00 AM`, `05:30 PM`, `22:00`, `04:30`).
   - Automated 24h midnight rollover calculation: when `closingTime < startTime` (e.g. `10:00 PM` to `04:30 AM`), computes:
     $$\text{durationMinutes} = (1440 - \text{startMinutes}) + \text{closeMinutes} = 390\text{ mins} = 6.50\text{ hrs}$$
   - Multiplies duration by `rentPerHour` for exact financial totals and tracks operator/diesel cash advances.
3. **Multi-Mode Cashflow Ledger**:
   - Supports `CASH_DRAWER`, `BANK_TRANSFER`, `UPI_ONLINE`, `VENDOR_CREDIT`, and `OWNER_DIRECT`.
   - Computes dynamic live financial aggregates across all matching records:
     - `totalExpenses`
     - `totalCashDrawerExpenses` (disbursements from site cash box)
     - `totalMachineRent`
     - `totalAdvancesPaid`
     - `totalMachineHours`
4. **Interactive UI & Role Security**:
   - Dedicated **Expenses** page (`/expenses`) with live KPI cards, multi-dimensional filters, dual entry modal (General Expense vs Machinery Hourly Log with live duration/cost calculation preview), and actionable ledger table.
   - Master Data tabs for **Expense Heads** and **Heavy Machinery**.
   - Site Boys can record expenses on-site and edit entries within a 2-hour window from creation, while deletion is restricted to Owner/Super Admin.

---

## 2. Changes Summary

### Backend
- **DTOs (`backend/src/expenses/dto/`)**:
  - `create-expense-category.dto.ts`, `update-expense-category.dto.ts`
  - `create-machinery.dto.ts`, `update-machinery.dto.ts`
  - `create-expense.dto.ts`, `update-expense.dto.ts`, `query-expenses.dto.ts`
- **Controllers & Services (`backend/src/expenses/`)**:
  - `expense-categories.service.ts` & `expense-categories.controller.ts`: List with auto-seed defaults, create, update, and relational delete protection.
  - `machinery.service.ts` & `machinery.controller.ts`: Heavy machinery CRUD, active toggling, and expense linkage checks.
  - `expenses.service.ts` & `expenses.controller.ts`: Time parsing, overnight rollover calculator, multi-mode ledger queries with financial summary calculations, and Site Boy 2-hour update rule.
  - `expenses.module.ts`: Registered in `app.module.ts`.
- **Master Data (`backend/src/master-data/master-data.service.ts`)**:
  - Enriched atomic bundle with auto-seeded `expenseCategories` and `machinery`.

### Frontend
- **API Client (`frontend/src/api/expenses.ts`)**:
  - Typed methods for expenses, categories, and machinery CRUD and summary metrics.
- **Pages & Components**:
  - `frontend/src/pages/ExpensesPage.tsx`: Full-featured expenses management page with KPI cards, dual modal, live working duration preview, and filtered ledger.
  - `frontend/src/components/expenses/ExpenseCategoriesManagement.tsx`: Category management tab.
  - `frontend/src/components/expenses/MachineryManagement.tsx`: Heavy machinery fleet tab.
  - `frontend/src/pages/MasterDataPage.tsx`: Integrated Expense Heads & Heavy Machinery tabs.
  - `frontend/src/App.tsx` & `frontend/src/components/layout/AppLayout.tsx`: Added `/expenses` route and navigation icon.

---

## 3. Verification & Test Results

### Automated E2E Test Suite (`tests/e2e-system.test.js`)
All 68 tests passed cleanly (100% pass rate):

```
✔ 11.1 Hurdle 13 Part 3: Owner fetches expense categories and default heads are auto-seeded (2.95ms)
✔ 11.2 Hurdle 13 Part 3: Owner creates custom expense category and registers heavy machinery (17.85ms)
✔ 11.3 Hurdle 13 Part 3: Owner records general site expenses with various payment modes (22.35ms)
✔ 11.4 Hurdle 13 Part 3: Heavy Machinery hourly rental engine calculates daytime working hours & cost accurately (13.49ms)
✔ 11.5 Hurdle 13 Part 3: Heavy Machinery hourly rental engine computes overnight (cross-midnight) rollover & operator advance (19.68ms)
✔ 11.6 Hurdle 13 Part 3: Queries expenses ledger with multi-dimensional filtering & dynamic financial aggregates (12.58ms)
✔ 11.7 Hurdle 13 Part 3: Site Boy records expense and enforces 2-hour update rule / restrictions (100.68ms)
✔ 11.8 Hurdle 13 Part 3: Soft-deletes expense and verifies exclusion from ledger summaries and master data safeguards (15.42ms)

ℹ tests 68
ℹ suites 6
ℹ pass 68
ℹ fail 0
```

### Build & Compilation Checks
- `npm run build --workspace=backend`: 0 errors.
- `npm run build --workspace=frontend`: 0 errors.
