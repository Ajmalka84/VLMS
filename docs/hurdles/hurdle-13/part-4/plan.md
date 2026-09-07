# Hurdle 13 — Part 4: Role-Based App Experience & Site Boy Field Workflow

## Status: ⬜ Not Started

---

## 1. Objective
Implement tailored navigation and operational restrictions for each role (`OWNER`, `CO_PARTNER`, `SITE_BOY`, `SUPER_ADMIN`), build the Site Boy dedicated field flow (locked to assigned site, adding global vehicles/contractors, shift drawer closure), and ensure offline resilience.

---

## 2. Deliverables & Changes

1. **Role-Based Navigation & Layout (`frontend/src/components/layout/AppLayout.tsx`)**:
   - **SUPER_ADMIN**: Customers (`/admin/users`), Reports (`/reports`).
   - **OWNER**: Dashboard (`/dashboard`), Loads (`/loads`), Expenses (`/expenses`), Reports (`/reports`), Master Data & Team (`/settings`).
   - **CO_PARTNER**: Dashboard (`/dashboard` - filtered to assigned sites), Reports (`/reports` - filtered to assigned sites).
   - **SITE_BOY**: Loads (`/loads` - locked to assigned site), Expenses (`/expenses` - locked to assigned site), Masters (`/settings` - Vehicles & Contractors only).
2. **Site-Locking & Field Restrictions for Site Boy**:
   - Site dropdown in Load and Expense creation is locked to the Site Boy's `assignedSiteId`.
   - Creation of new Vehicles and Contractors by Site Boy saves under `user.ownerId`, instantly reflecting across the entire business.
3. **Daily Shift Cash Drawer Close & Reconciliation (`backend/src/shifts` & `frontend`)**:
   - `POST /api/v1/shifts/close`: Site Boy enters `actualHandoverCash`, calculates discrepancy against `expectedCash` (`openingCash + spotCashLoads - cashExpenses - machineAdvances`).
   - Owner digital approval flow.
4. **Offline Caching & Queue**:
   - Local caching of master bundle in LocalStorage/IndexedDB for uninterrupted entry in deep quarry pits with auto-sync on reconnect.

---

## 3. Verification Commands & Checks

```bash
# 1. Verify role-based route guard and site lock tests
npm test --workspace=frontend

# 2. Build full application
npm run build
```

---

## 4. Post-Execution Documentation
*(To be completed in `walkthrough.md` upon completion of Part 4)*
