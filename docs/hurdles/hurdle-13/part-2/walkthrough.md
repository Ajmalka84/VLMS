# Hurdle 13 — Part 2: Sub-Accounts & Quota Management Subsystem — Walkthrough

## 1. Overview
Hurdle 13 Part 2 implements the multi-tier Sub-Accounts and Quota Management subsystem:
1. **Sub-Accounts Architecture**:
   - **Co-Partners (`CO_PARTNER`)**: Associated with an Owner account. Can be assigned across multiple quarry sites with individual equity share percentages (0% - 100%) and temporal versioning (`effectiveFrom` / `effectiveTo` interval slicing).
   - **Site Boys (`SITE_BOY`)**: Associated with an Owner account and strictly bound to a single active quarry site for weighbridge operations.
   - **Automatic Deactivation**: When all active site shares are detached from a Co-partner, the account is automatically marked inactive.
2. **Quota Enforcement Engine**:
   - **Default Operational Limits**: 3 active Co-partners and 2 active Site Boys per Owner account.
   - **Enforcement Interceptor**: Creates/activations exceeding the user's allocated quota return `HTTP 400 Bad Request` with error code `QUOTA_EXCEEDED` and helpful guidance to contact Super Admin for quota expansion.
3. **Super Admin Quota Expansion & Audit Trail**:
   - Super Admins can update `coPartnerQuota` and `siteBoyQuota` via `PATCH /api/v1/admin/users/:id/quotas`.
   - Generates immutable financial audit records in `QuotaTransaction` logging slot additions, previous/new quotas, fees collected (₹2,000 / slot), and payment reference numbers.
4. **Interactive Frontend Management**:
   - Embedded Team Management tab in `MasterDataPage.tsx` with live quota meters, interactive Co-partner modal with dynamic multi-site share percentage validation, Site Boy modal with single site dropdown, and soft deactivation flows.
   - Super Admin Quota Expansion modal in `CustomersPage.tsx` with live quota counter controls, fee calculator, and transaction history.

---

## 2. Changes Summary

### Backend
- **DTOs (`backend/src/sub-accounts/dto/`)**:
  - `create-co-partner.dto.ts`, `update-co-partner.dto.ts`: Support dynamic site allocations with `sharePercentage` and `effectiveFrom`/`effectiveTo` dates.
  - `create-site-boy.dto.ts`, `update-site-boy.dto.ts`: Site boy creation and single site binding.
  - `update-user-quotas.dto.ts` (`backend/src/admin/dto/`): Quota updates with `amountPaid`, `paymentRef`, and `notes`.
- **Sub-Accounts Module (`backend/src/sub-accounts/`)**:
  - `sub-accounts.service.ts`: Implements quota check helper `validateQuota`, Co-partner CRUD with temporal share slicing in `PartnerSiteShare`, Site Boy CRUD with single site validation, and soft deactivation.
  - `sub-accounts.controller.ts`: Endpoints under `/api/v1/sub-accounts` protected by `JwtAuthGuard` and `RolesGuard(['OWNER'])`.
  - `sub-accounts.module.ts`: Registered in `app.module.ts`.
- **Super Admin Service (`backend/src/admin/admin-users.service.ts`)**:
  - `updateQuotas`: Transactionally updates quotas and inserts `QuotaTransaction` audit log.
  - Enriched `getUserById` and `listUsers` with `quotaUsage` statistics (`active` vs `max`).

### Frontend
- **API Client (`frontend/src/api/subAccounts.ts` & `admin.ts`)**:
  - `fetchSubAccountsApi`, `createCoPartnerApi`, `updateCoPartnerApi`, `createSiteBoyApi`, `updateSiteBoyApi`, `deactivateSubAccountApi`.
  - `updateCustomerQuotasApi`.
- **UI Components (`frontend/src/components/team/TeamManagement.tsx`)**:
  - Quota visual cards with percentage progress bars and upgrade CTA triggers.
  - Interactive Co-partner modal with multi-site row additions, percentage validator (<= 100%), and date picker.
  - Site Boy modal with single site selector and 10-digit mobile validator.
  - Super Admin Quota upgrade modal in `CustomersPage.tsx`.

---

## 3. Verification & Test Results

### Automated E2E Test Suite (`tests/e2e-system.test.js`)
All 60 tests passed cleanly:

```
✔ 10.1 Hurdle 13 Part 2: Owner creates Co-Partners up to quota limit (3) with date-sliced site shares (250.81ms)
✔ 10.2 Hurdle 13 Part 2: Owner exceeds Co-Partner quota (4th partner) -> HTTP 400 with code QUOTA_EXCEEDED (5.70ms)
✔ 10.3 Hurdle 13 Part 2: Owner creates Site Boys up to quota limit (2) and rejects 3rd -> HTTP 400 QUOTA_EXCEEDED (165.81ms)
✔ 10.4 Hurdle 13 Part 2: Super Admin upgrades Owner quota (+₹4,000) and creates QuotaTransaction record (10.76ms)
✔ 10.5 Hurdle 13 Part 2: Owner successfully creates 4th Co-Partner after Super Admin quota expansion (83.49ms)
✔ 10.6 Hurdle 13 Part 2: Owner updates Co-Partner equity percentage with temporal date-slice versioning (18.54ms)
✔ 10.7 Hurdle 13 Part 2: Removing all active site shares from Co-Partner triggers auto-deactivation (14.77ms)

ℹ tests 60
ℹ suites 6
ℹ pass 60
ℹ fail 0
```

### Build & Compilation Checks
- `npm run build` in `backend`: 0 errors.
- `npm run build` in `frontend`: 0 errors.
