# Hurdle 15 - Part 4: Site Balance Sheet & Comprehensive Financial Health Engine

## 1. Objective
Establish a formal, double-entry financial statement engine providing a complete **Site Balance Sheet** and **Financial Health & Solvency Dashboard** for quarry operations.

Quarries operate with heavy credit exposure to contractors, on-site spot cash drawer floats, vendor machinery obligations, and distributed partner capital accounts. Part 4 brings institutional accounting rigor:
$$\text{Total Assets} = \text{Total Liabilities} + \text{Partner Equity}$$

---

## 2. Balance Sheet Accounting Model

```
                    QUARRY SITE BALANCE SHEET
========================================================================
ASSETS                                  LIABILITIES & PARTNER EQUITY
-------------------------------------   --------------------------------
1. CURRENT ASSETS                       1. CURRENT LIABILITIES
   a. Physical Cash Drawer Balance         a. Machinery Vendor Payables
   b. Contractor Receivables (Credit)      b. Accrued Operating Overheads
   
2. FIXED / CAPITAL ASSETS               2. PARTNER EQUITY & RETAINED
   a. Site Machinery & Equipment           a. Opening Partner Capital
                                           b. Cumulative Retained Profit
                                           c. Less: Partner Drawings
-------------------------------------   --------------------------------
TOTAL ASSETS                            TOTAL LIABILITIES & EQUITY
========================================================================
```

### Mathematical Definitions:
1. **Current Assets ($A_{\text{curr}}$)**:
   - $\text{Cash in Drawer } (A_{\text{cash}}) = \sum \text{Spot Cash Loads} - \sum \text{Cash Drawer Expenses}$
   - $\text{Contractor Receivables } (A_{\text{rec}}) = \sum \text{Contractor Credit Loads} - \sum \text{Contractor Payments}$
   - $A_{\text{curr}} = A_{\text{cash}} + A_{\text{rec}}$

2. **Current Liabilities ($L_{\text{curr}}$)**:
   - $\text{Machinery Vendor Payables } (L_{\text{mach}}) = \sum \text{Gross Machinery Rent} - \sum \text{Advances Paid}$
   - $\text{Accrued Unpaid Expenses } (L_{\text{exp}}) = \sum \text{Pending Vendor Expenses}$
   - $L_{\text{curr}} = L_{\text{mach}} + L_{\text{exp}}$

3. **Partner Equity ($E_{\text{total}}$)**:
   - $\text{Cumulative Net Operating Profit } (P_{\text{net}}) = \text{Total Revenue} - \text{Total Operating Expenses}$
   - $\text{Total Partner Drawings } (D_{\text{total}}) = \sum \text{Partner Drawings / Cash Payouts}$
   - $\text{Retained Earnings } (E_{\text{ret}}) = P_{\text{net}} - D_{\text{total}}$
   - $E_{\text{total}} = E_{\text{ret}} + \text{Direct Expenses Funded by Partners} - \text{Collections Retained by Partners}$

4. **Financial Health & Solvency Ratios**:
   - **Working Capital**: $\text{NWC} = A_{\text{curr}} - L_{\text{curr}}$
   - **Current Ratio**: $\text{CR} = \frac{A_{\text{curr}}}{L_{\text{curr}}}$
   - **Receivables Exposure %**: $\frac{A_{\text{rec}}}{A_{\text{curr}}} \times 100$
   - **Credit-to-Cash Sales Ratio**: $\frac{\text{Credit Revenue}}{\text{Cash Revenue}}$

---

## 3. Implementation Steps

### Phase 4.1: Backend Balance Sheet Engine
1. **Service (`backend/src/reports/reports-balance-sheet.service.ts` or integrated in `reports.service.ts`)**:
   - Aggregates cash drawer, contractor accounts receivable, vendor accounts payable, retained profit, drawings, and partner capital balances.
   - Computes double-entry validation score, net working capital, and solvency metrics.
2. **Controller (`backend/src/reports/reports.controller.ts`)**:
   - Expose `GET /reports/balance-sheet` with query parameters `siteId`, `asOfDate`, `startDate`, `endDate`, `customerId`.

### Phase 4.2: Frontend Integration
1. **API Client (`frontend/src/api/reports.ts`)**:
   - Add `getBalanceSheetReportApi()` and TypeScript types: `BalanceSheetResponse`, `BalanceSheetAssets`, `BalanceSheetLiabilities`, `BalanceSheetEquity`, `FinancialHealthRatios`.
2. **Reports UI (`frontend/src/pages/ReportsPage.tsx`)**:
   - Add `Site Balance Sheet` tab (`activeTab === 'balancesheet'`).
   - Side-by-side or stacked double-entry T-account layout (Assets on left, Liabilities + Equity on right).
   - Solvency KPI summary cards (Working Capital, Current Ratio, Receivables Risk).
   - WhatsApp and PDF/CSV export for Balance Sheet.

### Phase 4.3: Automated E2E Verification
1. Add test suite in `tests/e2e-system.test.js`:
   - `15.11`: Query `GET /reports/balance-sheet` and verify double-entry asset/liability/equity calculation.
   - `15.12`: Validate working capital, contractor receivables, and vendor payables reconciliation.
