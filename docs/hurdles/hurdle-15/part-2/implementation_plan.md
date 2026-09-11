# 🗺️ Hurdle 15 - Part 2: Contractor Credit Management, Collections & Running Party Ledger

## 🎯 Goal
Implement complete **Contractor Credit Management and Party Ledger (Passbook)** in VLMS. Enable contractors to accumulate debt via `CREDIT` loads, make partial/weekend payments, track **who collected the cash** (`collectedByUserId`: Owner vs. specific Co-Partner vs. Site Boy), and view/export live chronological running balance statements.

---

## 🛠️ Proposed Changes

### 1. Database & Prisma Schema (`backend/prisma/schema.prisma`)
- Create `ContractorPayment` model:
  - `id`: UUID
  - `siteId`: UUID (foreign key to `Site`)
  - `contractorId`: UUID (foreign key to `Contractor`)
  - `collectedByUserId`: UUID (foreign key to `User`)
  - `date`: Date
  - `amount`: Decimal(12, 2)
  - `paymentMode`: PaymentMode (`CASH_DRAWER`, `OWNER_DIRECT`, `CO_PARTNER_DIRECT`, `BANK_TRANSFER`, `UPI_ONLINE`)
  - `transferMethod`: String? (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`)
  - `referenceNumber`: String?
  - `remarks`: String?
  - `createdAt`, `updatedAt`, `deletedAt`
  - Indices on `[contractorId, date]`, `[siteId, date]`, `[collectedByUserId, date]`, `[deletedAt]`
- Update relations on `Contractor`, `Site`, and `User`.

### 2. Backend Implementation (`backend/src/contractors`)
- **DTOs**:
  - `dto/create-contractor-payment.dto.ts`
  - `dto/query-contractor-payments.dto.ts`
  - `dto/query-contractor-ledger.dto.ts`
- **Controller & Service**:
  - `POST /api/v1/contractor-payments`: Record payment receipt with collector tracking.
  - `GET /api/v1/contractor-payments`: List payments with site, contractor, collector, and date filters.
  - `DELETE /api/v1/contractor-payments/:id`: Soft delete payment.
  - `GET /api/v1/contractors/:id/ledger`: Fetch consolidated chronological passbook:
    - Merges `CREDIT` loads (Debit / Charge) and `ContractorPayment` (Credit / Payment).
    - Computes running balance: $\text{Balance}_k = \text{Balance}_{k-1} + \text{Debit}_k - \text{Credit}_k$.
  - `GET /api/v1/contractors/summary`: Aggregates Total Credit, Total Collected, and Net Outstanding Balance.

### 3. Frontend Implementation (`frontend/src`)
- **API (`frontend/src/api/contractors.ts`)**:
  - Add types and API calls for contractor payments, ledger, and summary.
- **Contractors Page (`frontend/src/pages/ContractorsPage.tsx` or `CustomersPage.tsx`)**:
  - Summary KPI cards: Total Credit Billed, Total Collected, Net Outstanding Balance.
  - Contractor rows with live outstanding debt badge.
  - **"Record Payment" Modal**: Quick modal to record ₹50,000 collection, select collector (`collectedByUserId`), payment method (Cash / UPI / Bank / Cheque), and remarks.
  - **"View Passbook / Ledger" Modal**: Filterable chronological ledger showing trips, receipts, and running balance.
  - **PDF Export & WhatsApp Share**: Generate customer statement for easy sharing.

---

## 🧪 Verification Plan
1. **Unit & API Tests**:
   - Create contractor $\rightarrow$ dispatch multiple `CREDIT` loads $\rightarrow$ verify total debt.
   - Record partial payment (e.g. ₹50,000 collected by Co-Partner) $\rightarrow$ verify balance reduced to ₹50,000.
   - Query ledger endpoint $\rightarrow$ verify chronological order and running balance computation.
   - Soft-delete payment $\rightarrow$ verify ledger and balance recalculate immediately.
2. **Frontend & E2E Verification**:
   - Full workspace TypeScript build (`npm run build --workspaces`).
   - Run complete test suite (`npm test`).
