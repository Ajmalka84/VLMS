# Hurdle 15 - Part 3: Multi-Partner Inter-Account Rebalancing & Equalisation Engine

## 1. Overview
In multi-partner quarry operations (e.g. 4 equity partners without a centralized company account), financial transactions occur across separate personal accounts:
1. Direct expenses funded by individual partners from their personal UPI/bank accounts ($F_i$).
2. Contractor credit collections received directly into individual partners' personal accounts ($C_i$).
3. Profit dividends earned via temporal site equity slices ($E_i$).
4. Partner cash drawings / advances taken from the on-site cash drawer ($D_i$).

Part 3 delivers the **Multi-Partner Rebalance & Zero-Sum Equalisation Matrix**, computing the net closing balance $B_i$ for every equity holder and generating **minimal peer-to-peer bank transfer instructions** to reconcile all partner personal accounts to zero-sum.

---

## 2. Core Mathematical Formulas

For each partner $i \in \{1, \dots, N\}$ on a site with Net Profit $P$:
$$E_i = P \times \frac{\text{SharePercentage}_i}{100}$$
$$F_i = \sum \text{Direct Expenses Funded by Partner } i$$
$$C_i = \sum \text{Contractor Payments Collected into Partner } i \text{'s Personal Account}$$
$$D_i = \sum \text{Drawings / Advances Taken by Partner } i$$
$$\text{Net Cash Retained } H_i = C_i + D_i$$
$$\text{Net Closing Settlement Position } B_i = E_i + F_i - H_i$$

### Zero-Sum Property:
$$\sum_{i=1}^N B_i = 0 \quad (\text{exclusive of unwithdrawn drawer cash})$$

* **Creditor ($B_i > 0$):** Entitled to receive money ($\text{Receives } ₹B_i$).
* **Debtor ($B_i < 0$):** Has collected or drawn more cash than their entitlement ($\text{Must Pay } ₹|B_i|$).
* **Settled ($B_i = 0$):** Fully equalised.

---

## 3. Implemented Components

### Backend
1. **`ReportsPartnerShareService` (`backend/src/reports/reports-partner-share.service.ts`)**:
   - `getPartnerSettlement()`: Enhanced individual statement with:
     - `directExpensesFunded`: Aggregated expenses with `payerPartnerUserId`.
     - `contractorPaymentsCollected`: Aggregated collections with `collectedByUserId`.
     - `netCashRetained`: $C_i + D_i$.
     - `netDividendPayable`: $E_i + F_i - (C_i + D_i)$.
   - `getMultiPartnerRebalanceReport()`: Computes multi-partner matrix and calculates minimal zero-sum peer-to-peer transfer instructions ($O(N)$ greedy matching algorithm).
2. **`ReportsController` (`backend/src/reports/reports.controller.ts`)**:
   - Exposed `GET /reports/partner-rebalance` guarded by `@Roles(SUPER_ADMIN, OWNER, CO_PARTNER)`.

### Frontend
1. **API Client (`frontend/src/api/reports.ts`)**:
   - Added `getPartnerRebalanceReportApi()` and types `PartnerRebalanceResponse`, `PartnerRebalanceMetric`, `RebalanceTransfer`.
2. **Reports UI (`frontend/src/pages/ReportsPage.tsx`)**:
   - **View Switcher**: Toggle between `Individual Partner Statement` and `Multi-Partner Equalisation Matrix`.
   - **Financial Flow Card**: Displays gross dividend earned, $+ \text{Direct Funded Expenses}$, $- \text{Contractor Cash Retained}$, $- \text{Drawings}$, and net dividend.
   - **Multi-Partner Rebalance Matrix Table**: Partner name, equity %, gross dividend, direct funded, collections, drawings, net closing balance, and Creditor / Debtor badges.
   - **Settlement Transfer Instructions Cards**: Visual transfer direction (`[Debtor] ➔ [Creditor] : ₹Amount`) with 1-click **"Remind Payer"** and **"Share Plan on WhatsApp"**.

---

## 4. Verification & Test Suite

The following automated E2E tests validate Part 3 functionality in `tests/e2e-system.test.js`:
- `✔ 15.9 Hurdle 15 Part 3: Partner settlement statement includes direct funded expenses and direct collections`
- `✔ 15.10 Hurdle 15 Part 3: Multi-Partner Rebalance Report computes zero-sum peer transfers`

Run test command:
```bash
node --test tests/e2e-system.test.js
```
Result: **85/85 tests passing**.
