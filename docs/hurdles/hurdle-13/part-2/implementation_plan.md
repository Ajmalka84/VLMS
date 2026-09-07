# Hurdle 13 — Part 2: Sub-Accounts & Quota Management Subsystem — Implementation Plan

## Overview
Part 2 implements the sub-account management architecture allowing Quarry Owners to onboard and manage **Co-Partners** (with multi-site assignment, percentage shares, and date-sliced equity intervals) and **Site Boys** (strictly assigned 1-to-1 to a site). It enforces strict quota boundaries (default 3 Co-partners and 2 Site Boys per Owner) and provides Super Admins with an override API/UI to expand quotas (+₹2,000 per extra slot) backed by an immutable transaction ledger.

---

## Architecture & Design Decisions

> [!IMPORTANT]
> **Temporal Equity Versioning**: When an owner modifies a Co-partner's percentage share or adds/removes site assignments, existing share slices are capped (`effectiveTo = newEffectiveFrom - 1 day`) and new slice records are inserted (`effectiveFrom = newEffectiveFrom`, `effectiveTo = null`). This ensures past month financial statements remain mathematically immutable.
>
> **Auto-Deactivation / Reactivation**: 
> - If an owner removes all active site shares from a Co-partner, the account automatically deactivates (`isActive: false`).
> - When re-assigning sites to an inactive Co-partner, the system re-activates the account provided active co-partners remain within the owner's quota limit.

---

## Detailed Implementation Breakdown

### 1. Backend: Sub-Accounts Module (`backend/src/sub-accounts/`)

#### DTOs:
- `CreateCoPartnerDto`: `name`, `mobile` (10 digits), `password` (min 6), `siteShares`: array of `{ siteId: string, sharePercentage: number, effectiveFrom?: string }`.
- `UpdateCoPartnerDto`: `name?`, `password?`, `isActive?`, `siteShares?`: array of `{ siteId: string, sharePercentage: number, effectiveFrom?: string, isActive?: boolean }`.
- `CreateSiteBoyDto`: `name`, `mobile` (10 digits), `password` (min 6), `assignedSiteId`: string.
- `UpdateSiteBoyDto`: `name?`, `password?`, `assignedSiteId?`, `isActive?`.

#### Service (`sub-accounts.service.ts`):
- `listSubAccounts(ownerId: string)`: Returns co-partners (with active/historical `PartnerSiteShare`), site-boys (with assigned site info), and quota metrics (`activeCoPartners`, `maxCoPartners`, `activeSiteBoys`, `maxSiteBoys`).
- `createCoPartner(ownerId: string, dto: CreateCoPartnerDto)`: Enforces `coPartnerQuota` limit (<= 3 default), mobile uniqueness, validates sites belong to owner and total shares <= 100%, and creates user + date-sliced shares in a transaction.
- `updateCoPartner(ownerId: string, partnerId: string, dto: UpdateCoPartnerDto)`: Applies temporal date-slice versioning for modified/deactivated shares, and handles auto-deactivation/reactivation.
- `createSiteBoy(ownerId: string, dto: CreateSiteBoyDto)`: Enforces `siteBoyQuota` limit (<= 2 default), validates assigned site belongs to owner, and creates user.
- `updateSiteBoy(ownerId: string, siteBoyId: string, dto: UpdateSiteBoyDto)`: Updates site boy credentials/assignment and checks quota when reactivating.
- `deleteSubAccount(ownerId: string, subAccountId: string)`: Soft-deactivates the sub-account and closes active shares.

#### Controller (`sub-accounts.controller.ts`):
- Routes guarded with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('OWNER')`:
  - `GET /api/v1/sub-accounts`
  - `POST /api/v1/sub-accounts/co-partners`
  - `PATCH /api/v1/sub-accounts/co-partners/:id`
  - `POST /api/v1/sub-accounts/site-boys`
  - `PATCH /api/v1/sub-accounts/site-boys/:id`
  - `DELETE /api/v1/sub-accounts/:id`

#### Module (`sub-accounts.module.ts`):
- Register controller and service, import in `AppModule`.

---

### 2. Backend: Super Admin Quota Management

#### DTO & Controller/Service Updates:
- `UpdateUserQuotasDto`: `coPartnerQuota?`, `siteBoyQuota?`, `amountPaid?`, `paymentRef?`, `notes?`.
- Endpoint: `PATCH /api/v1/admin/users/:id/quotas`
  - Updates `coPartnerQuota` / `siteBoyQuota`.
  - Records transaction audit in `QuotaTransaction`.
  - Returns updated user with quota metrics and transaction history.

---

### 3. Frontend: API Client & UI Subsystem

#### API Clients:
- `frontend/src/api/subAccounts.ts`: Typed API functions for `fetchSubAccountsApi`, `createCoPartnerApi`, `updateCoPartnerApi`, `createSiteBoyApi`, `updateSiteBoyApi`, `deactivateSubAccountApi`.
- `frontend/src/api/admin.ts`: Add `updateCustomerQuotasApi(id, dto)`.

#### Master Data Team Management UI (`frontend/src/components/team/TeamManagement.tsx`):
- **Quota Progress Cards**: Live meters showing Co-Partner usage (`X/3`) and Site Boy usage (`Y/2`).
- **Co-Partner Table & Modal**:
  - List active partners with badges showing assigned sites and % shares.
  - Modal with multi-site selection, percentage share inputs, dynamic total equity calculator (<= 100%), and `effectiveFrom` date selector.
- **Site Boy Table & Modal**:
  - List site boys with assigned site chip and active status toggle.
  - Modal with single site dropdown, name, mobile, and password.
- **Quota Alert Banner**: Notice displayed when quota is full with "Contact Administrator (+₹2,000)" action prompt.

#### Super Admin Customers Page (`frontend/src/pages/admin/CustomersPage.tsx`):
- Super Admin action button / modal in Customer management to expand `coPartnerQuota` and `siteBoyQuota` with amount and reference recording.

---

## Verification Plan

### Automated Tests
1. **Sub-Account Creation & Quota Enforcement**:
   - Create 3 Co-partners for an Owner -> Verify success.
   - Attempt to create a 4th Co-partner -> Verify HTTP 400 (`QUOTA_EXCEEDED`).
   - Create 2 Site Boys for an Owner -> Verify success.
   - Attempt to create a 3rd Site Boy -> Verify HTTP 400 (`QUOTA_EXCEEDED`).
2. **Super Admin Quota Expansion**:
   - Super Admin increases `coPartnerQuota` to 5 for Owner (+₹4,000 paid) -> Verify `QuotaTransaction` created.
   - Owner successfully creates 4th Co-partner.
3. **Date-Sliced Temporal Equity Versioning**:
   - Assign Partner 30% share starting on `2026-01-01`.
   - Update share to 40% starting on `2026-09-01`.
   - Verify previous slice has `effectiveTo: 2026-08-31` and new slice has `effectiveFrom: 2026-09-01, effectiveTo: null`.
4. **Auto-Deactivation Cascade**:
   - Remove all site shares from a Co-partner -> Verify account `isActive` switches to `false`.
5. **Full Test Suite & Build**:
   - Run `npm test` and `npm run build`.

### Manual / Localhost Verification
- Open http://localhost:5173 as Quarry Owner (`9846000001` / `Password@123`).
- Navigate to Master Data -> Team tab.
- Add Co-Partner with multiple sites and verify total percentage validation.
- Add Site Boy with assigned site.
- Log in as Super Admin (`ajmalka84@gmail.com` / `05thDec1995`) and verify customer quota upgrade interface.
