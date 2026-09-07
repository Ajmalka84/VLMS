# Hurdle 13 — Part 5: Advanced Financial Reports & Cashflow Subsystem

## Status: ✅ Completed

---

## 1. Objective
Deliver the complete financial intelligence suite: Site Daily & Monthly Cashflow Statements, Co-Partner Temporal Profit-Sharing Settlement Statements, Machinery Rental Logbook & Vendor Settlement Statements, and Multi-Format PDF/CSV Exporters.

---

## 2. Deliverables & Changes

1. **Site Cashflow Statement Subsystem (`backend/src/reports/reports-cashflow.service.ts`)**:
   - `GET /api/v1/reports/cashflow`: Site-wise and date-range cashflow breakdown.
     - **Cash Inflows**: Spot Cash Load collections (`PaymentType == CASH`), Cash Advances received.
     - **Cash Outflows**: Physical Cash Expenses (`PaymentMode == CASH_DRAWER`), Machine Advances paid in cash, Labour wages paid in cash.
     - **Net Closing Cash Balance**: Exact drawer balance calculation.
2. **Co-Partner Temporal Profit-Sharing Settlement (`backend/src/reports/reports-partner-share.service.ts`)**:
   - `GET /api/v1/reports/partner-settlement`: Calculates net profit distribution using temporal interval slicing:
     - For each date slice $i$ with percentage $\text{share}_i$:
       $$\text{Net Operating Margin}_i = \text{Loads Revenue}_i - (\text{Operating Expenses}_i + \text{Machinery Rents}_i)$$
       $$\text{Partner Gross Share}_i = \text{Net Operating Margin}_i \times \frac{\text{share}_i}{100}$$
     - Sums gross shares across intervals and deducts mid-month partner drawings (`PartnerPayout`) for the **Net Dividend Payable**.
3. **Machinery Rental Logbook & Vendor Settlement**:
   - `GET /api/v1/reports/machinery-settlement`: Total hours operated, hourly rent, gross rental amount, advances paid, and balance payable to machine owner/vendor.
4. **Enhanced Contractor Settlement & Reports UI (`frontend/src/pages/ReportsPage.tsx`)**:
   - Tabbed Report Suite: **Contractor Statements**, **Site Cashflow Statement**, **Partner Profit Sharing**, **Machinery Rental Logbook**.
   - Multi-format PDF Exporter with custom business headers, rubber-stamp lines, and CSV data export.

---

## 3. Verification Commands & Checks

```bash
# 1. Run complete reports test suite
npm test --workspace=backend -- -t "Reports"

# 2. Verify all tests pass
npm test
```

---

## 4. Post-Execution Documentation
*(To be completed in `walkthrough.md` upon completion of Part 5)*
