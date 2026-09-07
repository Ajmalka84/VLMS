# Hurdle 13 — Part 2: Sub-Accounts & Quota Management Subsystem

## Status: ✅ Complete

---

## 1. Objective
Implement the backend APIs and frontend UI for managing sub-accounts (Co-partners and Site boys) with date-ranged equity percentages, single-site assignments, quota limit enforcement (3 Co-partners, 2 Site-boys), and Super Admin quota overrides.

---

## 2. Deliverables & Changes

1. **Backend Sub-Accounts Module (`backend/src/sub-accounts`)**:
   - `GET /api/v1/sub-accounts`: List all co-partners and site boys under the current Owner, with quota metrics (`activeCoPartners`, `maxCoPartners`, `activeSiteBoys`, `maxSiteBoys`).
   - `POST /api/v1/sub-accounts/co-partners`: Create Co-partner with name, mobile, password, and assigned sites with `% shares` and `effectiveFrom` dates. Enforces `coPartnerQuota` limit (max 3 active unless upgraded).
   - `PATCH /api/v1/sub-accounts/co-partners/:id`: Update Co-partner details, enable/disable assigned sites, update `% shares` with temporal versioning (`effectiveFrom` / `effectiveTo` interval slicing).
   - `POST /api/v1/sub-accounts/site-boys`: Create Site Boy with name, mobile, password, and single assigned site. Enforces `siteBoyQuota` limit (max 2 active unless upgraded) and ensures 1 site boy per site.
   - `PATCH /api/v1/sub-accounts/site-boys/:id`: Update Site Boy details, change assigned site, toggle active status.
   - `DELETE /api/v1/sub-accounts/:id`: Soft-deactivate sub-account (preserves all historical load and expense creator audit trails).
2. **Super Admin Quota Management (`backend/src/admin/admin-users.service.ts`)**:
   - `PATCH /api/v1/admin/users/:id/quotas`: Update `coPartnerQuota` and `siteBoyQuota` upon customer payment (+₹2,000 per extra slot).
   - Record entry in `QuotaTransaction` table with payment reference.
3. **Frontend Sub-Accounts Management UI (`frontend/src/pages/MasterDataPage.tsx` or new Team Tab)**:
   - Dedicated "Team & Roles" tab for Owner.
   - Co-Partner Modal: Multi-select sites, enter `% share` per site with real-time total share validator ($\le 100\%$).
   - Site-Boy Modal: Select single active site, enter name, mobile, password.
   - Quota exhaustion alerts with "Upgrade Quota (+₹2,000)" contact prompt.
   - Super Admin customer editor with direct Quota expansion controls.

---

## 3. Verification Commands & Checks

```bash
# 1. Run unit/integration tests for sub-account creation & quota limits
npm test --workspace=backend -- -t "SubAccounts"

# 2. Verify frontend compilation
npm run build --workspace=frontend
```

---

## 4. Post-Execution Documentation
*(To be completed in `walkthrough.md` upon completion of Part 2)*
