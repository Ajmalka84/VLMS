# Hurdle 13 — Part 3: Expenses, Machinery/Hitachi Hours & Advance Engine

## Status: ✅ Complete

---

## 1. Objective
Build the Expense Categories and Machinery Masters subsystem, along with the heavy machinery hourly rental engine (Hitachi/JCB/Excavator time calculation with overnight rollover, hourly rent rates, and cash advance tracking) and general site expense recording.

---

## 2. Deliverables & Changes

1. **Expense Categories & Machinery Masters (`backend/src/expenses`)**:
   - `GET / POST / PATCH / DELETE /api/v1/expense-categories`: Manage categories (*Diesel, Labour, Explosives/Blasting, Maintenance, Electricity, Food/Tea, General*).
   - `GET / POST / PATCH / DELETE /api/v1/machinery`: Manage heavy machines (*Hitachi 210, CAT 320, JCB 3DX, Breaker*) with default rent per hour and vendor contacts.
2. **Machinery Hour & Expense Engine (`backend/src/expenses/expenses.service.ts`)**:
   - `POST /api/v1/expenses`: Create expense.
     - **General Expense**: Category, Amount, Date, `PaymentMode` (`CASH_DRAWER`, `BANK_TRANSFER`, `UPI_ONLINE`, `VENDOR_CREDIT`, `OWNER_DIRECT`), Paid To, Remarks.
     - **Machinery Rental Log**: Machinery ID, Start Time (e.g. `08:00 AM`), Closing Time (e.g. `05:30 PM`), Start/End Meter Readings, Rent per hour, Advance amount.
     - Automatic calculation: `totalHours = closingTime - startTime` (with overnight 24h rollover support), `amount = totalHours * rentPerHour`.
   - `GET /api/v1/expenses`: Filtered list by site, date range, category, machinery, payment mode, with summary metrics (`totalExpenses`, `totalCashDrawerExpenses`, `totalMachineRent`, `totalAdvancesPaid`).
   - `PATCH /api/v1/expenses/:id`: Update expense (enforcing 2-hour edit window for Site Boys).
   - `DELETE /api/v1/expenses/:id`: Soft-delete expense (`deletedAt`).
3. **Frontend Expense & Machine Entry UI (`frontend/src/pages/ExpensesPage.tsx` & Modals)**:
   - Modern tabbed/toggle entry form: **General Site Expense** vs **Machinery / Hitachi Hourly Log**.
   - Live interactive time calculator with automatic working duration preview and rental cost breakdown.

---

## 3. Verification Commands & Checks

```bash
# 1. Run expense & machinery calculation test suite
npm test --workspace=backend -- -t "Expenses"

# 2. Build full workspace
npm run build
```

---

## 4. Post-Execution Documentation
*(To be completed in `walkthrough.md` upon completion of Part 3)*
