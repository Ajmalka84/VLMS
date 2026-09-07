# Hurdle 13 — Part 1: Database Migration & Multi-Tenant Scoping Engine

## Status: ✅ Done


---

## 1. Objective
Establish the database schema, migration scripts, and backend authentication context to support multi-role sub-accounts (`OWNER`, `CO_PARTNER`, `SITE_BOY`, `SUPER_ADMIN`), tenant-scoped master data (`VehicleType`, `MaterialType`), temporal partner site shares, expense categories, machinery tracking, and quotas.

---

## 2. Deliverables & Changes

1. **Prisma Schema Update (`backend/prisma/schema.prisma`)**:
   - Add `UserRole` enum (`SUPER_ADMIN`, `OWNER`, `CO_PARTNER`, `SITE_BOY`).
   - Add `PaymentMode` enum (`CASH_DRAWER`, `BANK_TRANSFER`, `UPI_ONLINE`, `VENDOR_CREDIT`, `OWNER_DIRECT`).
   - Add fields to `User`: `ownerId`, `name`, `assignedSiteId`, `coPartnerQuota` (default 3), `siteBoyQuota` (default 2).
   - Scope `VehicleType` and `MaterialType` to `userId` (Owner account).
   - Add models: `PartnerSiteShare` (with `effectiveFrom` & `effectiveTo`), `PartnerPayout`, `ExpenseCategory`, `Machinery`, `Expense`, `ShiftReconciliation`, `QuotaTransaction`.
2. **Database Migration & Data Backfill**:
   - Create and apply Prisma migration `20260907_hurdle13_multi_role_and_expenses`.
   - Data Backfill Script: For existing database records, assign current vehicle types and material types to existing user accounts, set existing users as `role: OWNER`.
3. **Backend Auth & Context Refactor**:
   - Update `AuthUser` interface to include `role`, `ownerId`, `assignedSiteIds`, `assignedSiteId`.
   - Update `JwtStrategy` and `AuthService` to compute effective tenant owner and site permissions.
   - Enforce auto-deactivation logic on login if a co-partner has 0 active assigned sites or a site-boy's assigned site is inactive.
4. **Site Deactivation Hook**:
   - When a site's `isActive` flag is toggled to `false`, cascade unassign / deactivate site-boys and recalculate active co-partners.

---

## 3. Verification Commands & Checks

```bash
# 1. Generate Prisma Client & apply migration
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend

# 2. Run backend test suite
npm test --workspace=backend

# 3. Verify TypeScript build
npm run build --workspace=backend
```

---

## 4. Post-Execution Documentation
*(To be completed in `walkthrough.md` upon completion of Part 1)*
