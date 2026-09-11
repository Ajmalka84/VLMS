# 🗺️ Hurdle 15 - Part 1: Expense Funding Sources & Multi-Partner Direct Payment Engine

## 🎯 Goal
Enable tracking of **who funded an expense** (`Site Drawer`, `Owner Direct`, `Co-Partner Direct`, `Vendor Credit`, or `Company Bank`). When `Co-Partner Direct` is chosen, capture the specific `payerPartnerUserId` (Co-Partner) who paid out-of-pocket, along with the transfer channel (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`) and reference number.

---

## 🛠️ Proposed Changes

### 1. Database & Prisma Schema (`backend/prisma/schema.prisma`)
- Update `PaymentMode` enum to include `CO_PARTNER_DIRECT`.
- Add fields to `Expense` model:
  - `payerPartnerUserId`: `String? @map("payer_partner_user_id") @db.Uuid`
  - `transferMethod`: `String? @map("transfer_method") @db.VarChar(50)`
  - `referenceNumber`: `String? @map("reference_number") @db.VarChar(100)`
  - Relation: `payerPartner User? @relation("ExpensePayerPartner", fields: [payerPartnerUserId], references: [id], onDelete: SetNull)`
  - Indices: `@@index([payerPartnerUserId, date])`, `@@index([paymentMode, siteId, deletedAt])`
- Add relation on `User` model:
  - `paidDirectExpenses Expense[] @relation("ExpensePayerPartner")`
- Run Prisma migration & client generation.

### 2. Backend Implementation (`backend/src/expenses`)
- **DTOs (`dto/create-expense.dto.ts` & `dto/update-expense.dto.ts`)**:
  - Add `CO_PARTNER_DIRECT` to `PaymentModeDto`.
  - Add optional `@IsUUID() payerPartnerUserId?: string;`.
  - Add optional `@IsString() transferMethod?: string;`.
  - Add optional `@IsString() referenceNumber?: string;`.
  - Custom / conditional validation: `payerPartnerUserId` is required if `paymentMode === 'CO_PARTNER_DIRECT'`.
- **Service (`expenses.service.ts`)**:
  - In `create` and `update`:
    - If `paymentMode === 'CO_PARTNER_DIRECT'`, ensure `payerPartnerUserId` belongs to the tenant and is a valid `CO_PARTNER` or assigned partner.
    - If `paymentMode !== 'CO_PARTNER_DIRECT'`, reset `payerPartnerUserId` to null.
  - In `findAll` / `findOne`:
    - Include `payerPartner: { select: { id: true, name: true, mobile: true, role: true } }`.
  - In summary/filters:
    - Allow filtering expenses by `payerPartnerUserId` and `paymentMode`.

### 3. Frontend Implementation (`frontend/src`)
- **API (`frontend/src/api/expenses.ts`)**:
  - Update `PaymentMode` type: `'CASH_DRAWER' | 'BANK_TRANSFER' | 'UPI_ONLINE' | 'VENDOR_CREDIT' | 'OWNER_DIRECT' | 'CO_PARTNER_DIRECT'`.
  - Update `Expense` interface to include `payerPartnerUserId`, `payerPartner`, `transferMethod`, `referenceNumber`.
  - Update `CreateExpensePayload` and `UpdateExpensePayload`.
- **Expenses Page (`frontend/src/pages/ExpensesPage.tsx`)**:
  - Update `ALL_PAYMENT_MODES` and `PAYMENT_MODES` options with badges and icons:
    - `CASH_DRAWER` ("Cash Drawer (Paid Now)")
    - `OWNER_DIRECT` ("Owner Direct")
    - `CO_PARTNER_DIRECT` ("Co-Partner Direct")
    - `VENDOR_CREDIT` ("Vendor Credit (Pay Later)")
    - `BANK_TRANSFER` ("Company Bank Transfer")
    - `UPI_ONLINE` ("Company UPI")
  - In the Expense Modal:
    - Add dynamic Co-Partner selector dropdown when `CO_PARTNER_DIRECT` is selected (populated from `masterData.subAccounts` where role is `CO_PARTNER`).
    - Add optional `Transfer Method` select (`CASH`, `UPI / GPay`, `Bank Transfer / NEFT`, `Cheque`) and `Reference #` input.
  - In Expense Table & Card Views:
    - Display payer badge (e.g., `👤 Co-Partner: Rajan (UPI)` or `👑 Owner Direct`).
  - In Expense Filters:
    - Add filter option for `Payment Mode` and `Payer Partner`.

---

## 🧪 Verification Plan
1. **Prisma & Backend Tests**:
   - Run Prisma migration.
   - Run unit/integration tests verifying `CO_PARTNER_DIRECT` requires a valid partner ID.
2. **End-to-End API Checks**:
   - Create an expense with `CO_PARTNER_DIRECT` and verify response includes `payerPartner`.
   - Update expense and verify payer details change appropriately.
3. **Frontend Verification**:
   - Open browser or build frontend (`npm run build --workspace=frontend`) to ensure zero TypeScript/bundle errors.
   - Verify modal interactions and UI responsiveness.
