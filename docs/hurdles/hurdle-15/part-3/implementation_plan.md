# Hurdle 15 - Part 3 Implementation Plan: Multi-Partner Inter-Account Rebalancing & Settlement Engine

## 1. Problem Definition
When multiple partners (e.g., 4 co-owners) operate a quarry site without a joint company bank account, money moves across separate personal bank accounts and the on-site cash drawer:
- **Direct Collections**: Partner A receives ₹50,000 from a contractor into their personal GPay.
- **Direct Expenses**: Partner B pays ₹25,000 for government transit permits / geology challan from their personal SBI account.
- **On-Site Operations**: Site boy collects ₹1,00,000 spot cash and spends ₹15,000 on diesel from the drawer.
- **Drawings**: Partner C takes ₹20,000 drawings.

Without an automated inter-account settlement engine, calculating who owes whom requires manual spreadsheets.

## 2. Proposed Mathematical Model

For each partner $i$ on site $S$ during period $[t_{\text{start}}, t_{\text{end}}]$:

1. **Site Profit**:
   $$\text{Net Profit} = \text{Total Revenue (Spot Cash + Credit Dispatches)} - \text{Total Operating Expenses (Drawer + Direct)}$$

2. **Partner Financial Metrics**:
   - **Equity Entitlement**: $E_i = \text{Net Profit} \times \text{Share } \%_i$
   - **Expenses Funded Directly**: $F_i = \sum \text{Expenses where } \text{payerPartnerUserId} = i$
   - **Contractor Collections Retained**: $C_i = \sum \text{Contractor Payments where } \text{collectedByUserId} = i \text{ and } \text{mode} \in \{\text{OWNER\_DIRECT}, \text{CO\_PARTNER\_DIRECT}\}$
   - **Drawings / Payouts Taken**: $D_i = \sum \text{Partner Payouts taken by } i$
   - **Net Cash Held by Partner**: $H_i = C_i + D_i$
   - **Net Partner Balance**:
     $$B_i = E_i + F_i - H_i = E_i + F_i - (C_i + D_i)$$
     - If $B_i > 0$: Partner is **Creditor** (entitled to receive $B_i$ from pool).
     - If $B_i < 0$: Partner is **Debtor** (owes $|B_i|$ to pool).
     - If $B_i = 0$: Partner is **Settled**.

3. **Inter-Partner Rebalancing Settlement Algorithm**:
   - Reconciles debtors to creditors using greedy balance elimination to produce minimal peer-to-peer settlement transfers:
     - e.g. *Partner 1 (Debtor -₹25,000) $\rightarrow$ transfer ₹25,000 to Partner 3 (Creditor +₹25,000)*.

## 3. Implementation Steps

### Step 1: Backend Settlement Service Enhancement (`backend/src/reports/reports-partner-share.service.ts`)
- Update `calculatePartnerSettlement`:
  - Fetch direct expenses funded by partner ($F_i$).
  - Fetch contractor payments collected directly by partner ($C_i$).
  - Include $F_i$ and $C_i$ in the partner's statement.
  - Compute $B_i = E_i + F_i - (C_i + D_i)$.
- Create `getMultiPartnerRebalanceReport(ownerId, siteId, startDate, endDate)`:
  - Iterates over all equity partners for the site.
  - Computes $(E_i, F_i, C_i, D_i, B_i)$ for each partner.
  - Solves the peer-to-peer transfer graph (minimal settlement steps).
  - Returns:
    ```json
    {
      "site": { "id": "...", "siteName": "..." },
      "period": { "startDate": "...", "endDate": "..." },
      "siteSummary": { "totalRevenue": ..., "totalExpenses": ..., "netProfit": ... },
      "partners": [ ... ],
      "rebalanceTransfers": [
        { "fromPartner": { ... }, "toPartner": { ... }, "amount": 25000, "reason": "Inter-account profit & direct expense equalisation" }
      ]
    }
    ```

### Step 2: Backend Controller & Module (`backend/src/reports/reports.controller.ts`)
- Expose `GET /reports/partner-rebalance?siteId=...&startDate=...&endDate=...`.

### Step 3: Frontend UI Components (`frontend/src/`)
- Update `frontend/src/api/reports.ts` with `getPartnerRebalanceReportApi`.
- Enhance the **Partner Settlement** tab in `ReportsPage.tsx`:
  - Add **"Multi-Partner Rebalance & Equalisation"** view.
  - Visual matrix showing:
    - Partner Equity %
    - Profit Share
    - Direct Expenses Funded (+)
    - Contractor Collections Retained (-)
    - Net Payouts / Drawings (-)
    - Final Net Due / Payable
  - Actionable Settlement Transfer Instructions card (e.g. *“Transfer ₹X from Partner A to Partner B”*).
  - One-click WhatsApp share of the complete multi-partner settlement sheet.

### Step 4: Verification & Automated Tests
- Add tests in `tests/e2e-system.test.js`:
  - Test multi-partner equity settlement with asymmetric direct funding and collections.
  - Verify exact zero-sum peer-to-peer rebalancing graph.
