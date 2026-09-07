# Hurdle 13 — Multi-Role Organization, Expenses & Financial Intelligence

## Status: 🔄 In Progress

---

## 1. Executive Summary & Vision

Hurdle 13 transforms VLMS from a single-user customer portal into a **Multi-Role Collaborative Quarry & Crusher Management Platform**. 

It addresses:
1. **Multi-Role Hierarchy & Quotas**: SaaS Owner (`SUPER_ADMIN`), Quarry Business Owner (`OWNER`), Site Investor (`CO_PARTNER` with site-specific `% shares`), and Site Supervisor (`SITE_BOY` assigned strictly 1-to-1 to a site).
2. **Temporal Partner Site Share Ledger**: Exact interval versioning (`effectiveFrom` – `effectiveTo`) so past settlement calculations remain mathematically immutable when equity shares change.
3. **Tenant-Scoped Master Data**: `VehicleType` and `MaterialType` become fully tenant-isolated under the Owner account.
4. **Site Expenses & Heavy Machinery Rental Engine**: Hourly rental logs for Excavators/Hitachis/JCBs (Start/End time, rollover handling, hourly rate, and advance deductions).
5. **Site Cash Drawer & Financial Intelligence**: Shift cash drawer reconciliation, site cashflow statements, and partner profit-sharing dividend distributions.

---

## 2. Structural Part Breakdown

Hurdle 13 is divided into 5 distinct, sequential phases:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 1: Database Migration & Multi-Tenant Scoping Engine               │
│ - Prisma Schema with Temporal Shares, Expenses, Machinery, Quotas       │
│ - Tenant-scoping migration for VehicleType and MaterialType             │
│ - Auth & JWT refactor (ownerId, role, assignedSiteIds, auto-deactivation)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 2: Sub-Accounts & Quota Management Subsystem                       │
│ - Owner Sub-Account Manager (Co-partners with Date-ranged % shares)    │
│ - Site-boy 1-to-1 site assignment & quota limits (3 CPs, 2 SBs)        │
│ - Super Admin quota override (+₹2,000) & quota transaction ledger      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 3: Expenses, Machinery/Hitachi Hours & Advance Engine              │
│ - Expense Categories & Machinery Master CRUD                            │
│ - Machine Time Calculator (Start/End Time, Rollover, Rate/hr, Advances) │
│ - Expenses CRUD & Payment Mode Categorization                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 4: Role-Based App Experience & Site Boy Field Workflow            │
│ - Role navigation & site-locking for Site Boy / Co-Partner              │
│ - Global master creation from Site Boy (Vehicle & Contractor)           │
│ - Daily Shift Drawer Close & Handover Reconciliation                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PART 5: Advanced Financial Reports & Cashflow Subsystem                │
│ - Site Daily & Monthly Cashflow Statement (Drawer Inflow vs Outflows)   │
│ - Co-Partner Temporal Profit-Sharing Settlement Statement               │
│ - Machinery Rental Logbook & Vendor Settlement Statement               │
│ - Enhanced Multi-Format Export (PDF with custom headers, CSV)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Hole & Vulnerability Analysis

### Co-Partner Roles
- **CP-1 (Temporal Share Versioning)**: Editing a partner's share (e.g. 50% to 35% on Aug 1) creates a new time-sliced record (`effectiveFrom: 2026-08-01`), keeping past settlements for March calculated at 50%.
- **CP-2 (Over-Allocation Guard)**: Enforces $\sum \text{PartnerShares} \le 100\%$ per site across any time interval.
- **CP-3 (Drawings & Interim Payouts)**: Tracks mid-month withdrawals (`PartnerPayout`) so Net Settlement = `Gross Profit Share - Drawings`.
- **CP-4 (Loss & Monsoon Months)**: Explicitly tracks negative operating margins as carryover deficits.
- **CP-5 (Site Isolation)**: Strict query scoping so Co-partners only see data for their assigned sites.

### Site Boy Roles
- **SB-1 (Offline Quarry Operations)**: LocalStorage/IndexedDB cache of master data with client-UUID load queuing.
- **SB-2 (Spot Cash Drawer Reconciliation)**: End-of-shift drawer reconciliation (`ShiftReconciliation`) comparing expected cash vs physical handover cash.
- **SB-3 (Midnight Shift Rollovers)**: Automatically handles machinery shifts running across 12:00 AM (e.g. 21:00 to 05:00 = 8.0 hrs).
- **SB-4 (Fraud Prevention)**: Immutable records after 2 hours / shift close.
- **SB-5 (Global Master Reflection)**: Vehicles and Contractors registered by Site Boys save under `ownerId` and are instantly accessible across all the Owner's sites.

### Owner Roles
- **OW-1 (Fleet Movement)**: Machinery assets are registered organization-wide and assigned to specific sites per shift log.
- **OW-2 (Expense Payment Modes)**: Distinguishes physical cash (`CASH_DRAWER`) from `BANK_TRANSFER`, `UPI`, or `VENDOR_CREDIT`.
- **OW-3 (Dual-Mode Reports)**: Supports both site-specific statements and organization-wide consolidated reports.
- **OW-4 (Safe Site Deactivation)**: Soft-deactivation preserves all historical audits and tax records while deactivating linked site boys.

### Super Admin Roles
- **SA-1 (Quota Adjustment Tracking)**: Logs all quota increases (+₹2,000 per extra co-partner/site-boy slot) with payment references.
- **SA-2 (Subscription Inheritance)**: Sub-accounts inherit the parent Owner's subscription state.

---

## 4. Complete Database Schema (Prisma)

```prisma
enum UserRole {
  SUPER_ADMIN
  OWNER
  CO_PARTNER
  SITE_BOY
}

enum PaymentType {
  CASH
  CREDIT
}

enum PaymentMode {
  CASH_DRAWER
  BANK_TRANSFER
  UPI_ONLINE
  VENDOR_CREDIT
  OWNER_DIRECT
}

model User {
  id                    String    @id @default(uuid()) @db.Uuid
  ownerId               String?   @map("owner_id") @db.Uuid
  name                  String?   @map("name") @db.VarChar(100)
  businessName          String    @map("business_name") @db.VarChar(150)
  mobile                String    @unique @map("mobile") @db.VarChar(20)
  passwordHash          String    @map("password_hash") @db.VarChar
  role                  UserRole  @default(OWNER) @map("role")
  assignedSiteId        String?   @map("assigned_site_id") @db.Uuid
  coPartnerQuota        Int       @default(3) @map("co_partner_quota")
  siteBoyQuota          Int       @default(2) @map("site_boy_quota")
  gstin                 String?   @map("gstin") @db.VarChar(20)
  isActive              Boolean   @default(true) @map("is_active")
  subscriptionPlan      String    @default("ANNUAL") @map("subscription_plan") @db.VarChar(50)
  subscriptionStartsAt  DateTime  @default(now()) @map("subscription_starts_at") @db.Timestamp
  subscriptionExpiresAt DateTime? @map("subscription_expires_at") @db.Timestamp
  gracePeriodDays       Int       @default(7) @map("grace_period_days")
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt             DateTime  @updatedAt @map("updated_at") @db.Timestamp

  owner                 User?               @relation("OwnerSubAccounts", fields: [ownerId], references: [id], onDelete: Cascade)
  subAccounts           User[]              @relation("OwnerSubAccounts")
  assignedSite          Site?               @relation("SiteBoyAssignment", fields: [assignedSiteId], references: [id], onDelete: SetNull)
  partnerShares         PartnerSiteShare[]
  partnerPayouts        PartnerPayout[]     @relation("PartnerDrawings")
  recordedPayouts       PartnerPayout[]     @relation("PayoutRecorder")
  sites                 Site[]              @relation("OwnerSites")
  vehicles              Vehicle[]
  contractors           Contractor[]
  vehicleTypes          VehicleType[]
  materialTypes         MaterialType[]
  expenseCategories     ExpenseCategory[]
  machinery             Machinery[]
  recordedExpenses      Expense[]           @relation("ExpenseRecorder")
  shiftReconciliations  ShiftReconciliation[] @relation("ShiftSupervisor")
  approvedReconciliations ShiftReconciliation[] @relation("ShiftApprover")
  quotaTransactions     QuotaTransaction[]

  @@index([ownerId])
  @@index([mobile])
  @@index([role])
  @@map("users")
}

model Site {
  id                    String              @id @default(uuid()) @db.Uuid
  userId                String              @map("user_id") @db.Uuid
  siteName              String              @map("site_name") @db.VarChar
  location              String              @map("location") @db.VarChar
  pincode               String              @map("pincode") @db.VarChar
  isActive              Boolean             @default(true) @map("is_active")
  createdAt             DateTime            @default(now()) @map("created_at") @db.Timestamp
  updatedAt             DateTime            @updatedAt @map("updated_at") @db.Timestamp

  user                  User                @relation("OwnerSites", fields: [userId], references: [id], onDelete: Cascade)
  rates                 Rate[]
  loads                 Load[]
  expenses              Expense[]
  partnerShares         PartnerSiteShare[]
  partnerPayouts        PartnerPayout[]
  siteBoys              User[]              @relation("SiteBoyAssignment")
  shiftReconciliations  ShiftReconciliation[]

  @@map("sites")
}

model PartnerSiteShare {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  siteId          String    @map("site_id") @db.Uuid
  sharePercentage Decimal   @map("share_percentage") @db.Decimal(5, 2)
  effectiveFrom   DateTime  @default(now()) @map("effective_from") @db.Date
  effectiveTo     DateTime? @map("effective_to") @db.Date
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamp

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  site            Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@index([userId, siteId, effectiveFrom, effectiveTo])
  @@map("partner_site_shares")
}

model PartnerPayout {
  id               String      @id @default(uuid()) @db.Uuid
  siteId           String      @map("site_id") @db.Uuid
  partnerUserId    String      @map("partner_user_id") @db.Uuid
  recordedByUserId String      @map("recorded_by_user_id") @db.Uuid
  date             DateTime    @map("date") @db.Date
  amount           Decimal     @map("amount") @db.Decimal(12, 2)
  paymentMode      PaymentMode @default(BANK_TRANSFER) @map("payment_mode")
  referenceNumber  String?     @map("reference_number") @db.VarChar(100)
  remarks          String?     @map("remarks") @db.VarChar(255)
  createdAt        DateTime    @default(now()) @map("created_at") @db.Timestamp
  updatedAt        DateTime    @updatedAt @map("updated_at") @db.Timestamp

  site             Site        @relation(fields: [siteId], references: [id], onDelete: Cascade)
  partner          User        @relation("PartnerDrawings", fields: [partnerUserId], references: [id], onDelete: Cascade)
  recordedBy       User        @relation("PayoutRecorder", fields: [recordedByUserId], references: [id], onDelete: Restrict)

  @@index([siteId, partnerUserId, date])
  @@map("partner_payouts")
}

model VehicleType {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  name      String    @map("name") @db.VarChar
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamp

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicles  Vehicle[]
  rates     Rate[]

  @@unique([userId, name])
  @@map("vehicle_types")
}

model MaterialType {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String   @map("name") @db.VarChar
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamp

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rates     Rate[]
  loads     Load[]

  @@unique([userId, name])
  @@map("material_types")
}

model Vehicle {
  id            String      @id @default(uuid()) @db.Uuid
  userId        String      @map("user_id") @db.Uuid
  vehicleNumber String      @map("vehicle_number") @db.VarChar
  vehicleTypeId String      @map("vehicle_type_id") @db.Uuid
  createdAt     DateTime    @default(now()) @map("created_at") @db.Timestamp
  updatedAt     DateTime    @updatedAt @map("updated_at") @db.Timestamp

  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  vehicleType   VehicleType @relation(fields: [vehicleTypeId], references: [id], onDelete: Restrict)
  loads         Load[]

  @@unique([userId, vehicleNumber])
  @@map("vehicles")
}

model Contractor {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  name      String   @map("name") @db.VarChar
  mobile    String   @map("mobile") @db.VarChar
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamp
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamp

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  loads     Load[]

  @@map("contractors")
}

model Rate {
  id             String       @id @default(uuid()) @db.Uuid
  siteId         String       @map("site_id") @db.Uuid
  vehicleTypeId  String       @map("vehicle_type_id") @db.Uuid
  materialTypeId String       @map("material_type_id") @db.Uuid
  amount         Decimal      @map("amount") @db.Decimal(12, 2)
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamp
  updatedAt      DateTime     @updatedAt @map("updated_at") @db.Timestamp

  site           Site         @relation(fields: [siteId], references: [id], onDelete: Cascade)
  vehicleType    VehicleType  @relation(fields: [vehicleTypeId], references: [id], onDelete: Restrict)
  materialType   MaterialType @relation(fields: [materialTypeId], references: [id], onDelete: Restrict)
  loads          Load[]

  @@unique([siteId, vehicleTypeId, materialTypeId])
  @@map("rates")
}

model ExpenseCategory {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  name      String    @map("name") @db.VarChar
  isDefault Boolean   @default(false) @map("is_default")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamp

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses  Expense[]

  @@unique([userId, name])
  @@map("expense_categories")
}

model Machinery {
  id                 String    @id @default(uuid()) @db.Uuid
  userId             String    @map("user_id") @db.Uuid
  name               String    @map("name") @db.VarChar(100)
  code               String?   @map("code") @db.VarChar(50)
  defaultRentPerHour Decimal?  @map("default_rent_per_hour") @db.Decimal(10, 2)
  vendorName         String?   @map("vendor_name") @db.VarChar(100)
  vendorMobile       String?   @map("vendor_mobile") @db.VarChar(20)
  isActive           Boolean   @default(true) @map("is_active")
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamp

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses           Expense[]

  @@map("machinery")
}

model Expense {
  id                 String          @id @default(uuid()) @db.Uuid
  siteId             String          @map("site_id") @db.Uuid
  categoryId         String          @map("category_id") @db.Uuid
  recordedByUserId   String          @map("recorded_by_user_id") @db.Uuid
  date               DateTime        @map("date") @db.Date
  amount             Decimal         @map("amount") @db.Decimal(12, 2)
  paymentMode        PaymentMode     @default(CASH_DRAWER) @map("payment_mode")
  paidTo             String?         @map("paid_to") @db.VarChar(100)
  remarks            String?         @map("remarks") @db.VarChar(255)
  
  machineryId        String?         @map("machinery_id") @db.Uuid
  startTime          String?         @map("start_time") @db.VarChar(20)
  closingTime        String?         @map("closing_time") @db.VarChar(20)
  startMeterReading  Decimal?        @map("start_meter_reading") @db.Decimal(10, 2)
  endMeterReading    Decimal?        @map("end_meter_reading") @db.Decimal(10, 2)
  totalHours         Decimal?        @map("total_hours") @db.Decimal(6, 2)
  rentPerHour        Decimal?        @map("rent_per_hour") @db.Decimal(10, 2)
  advanceAmount      Decimal?        @default(0.00) @map("advance_amount") @db.Decimal(12, 2)
  
  createdAt          DateTime        @default(now()) @map("created_at") @db.Timestamp
  updatedAt          DateTime        @updatedAt @map("updated_at") @db.Timestamp
  deletedAt          DateTime?       @map("deleted_at") @db.Timestamp

  site               Site            @relation(fields: [siteId], references: [id], onDelete: Cascade)
  category           ExpenseCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  recordedBy         User            @relation("ExpenseRecorder", fields: [recordedByUserId], references: [id], onDelete: Restrict)
  machinery          Machinery?      @relation(fields: [machineryId], references: [id], onDelete: SetNull)

  @@index([siteId, date])
  @@index([categoryId, date])
  @@index([machineryId, date])
  @@index([deletedAt])
  @@map("expenses")
}

model ShiftReconciliation {
  id                 String    @id @default(uuid()) @db.Uuid
  siteId             String    @map("site_id") @db.Uuid
  supervisorUserId   String    @map("supervisor_user_id") @db.Uuid
  approvedByUserId   String?   @map("approved_by_user_id") @db.Uuid
  date               DateTime  @map("date") @db.Date
  shiftType          String    @default("DAY") @map("shift_type") @db.VarChar(20)
  openingCash        Decimal   @default(0.00) @map("opening_cash") @db.Decimal(12, 2)
  cashInflows        Decimal   @map("cash_inflows") @db.Decimal(12, 2)
  cashOutflows       Decimal   @map("cash_outflows") @db.Decimal(12, 2)
  expectedCash       Decimal   @map("expected_cash") @db.Decimal(12, 2)
  actualHandoverCash Decimal   @map("actual_handover_cash") @db.Decimal(12, 2)
  discrepancy        Decimal   @map("discrepancy") @db.Decimal(12, 2)
  remarks            String?   @map("remarks") @db.VarChar(255)
  isApproved         Boolean   @default(false) @map("is_approved")
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamp
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamp

  site               Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  supervisor         User      @relation("ShiftSupervisor", fields: [supervisorUserId], references: [id], onDelete: Restrict)
  approvedBy         User?     @relation("ShiftApprover", fields: [approvedByUserId], references: [id], onDelete: SetNull)

  @@index([siteId, date])
  @@map("shift_reconciliations")
}

model Load {
  id             String      @id @default(uuid()) @db.Uuid
  siteId         String      @map("site_id") @db.Uuid
  date           DateTime    @map("date") @db.Date
  vehicleId      String      @map("vehicle_id") @db.Uuid
  materialTypeId String      @map("material_type_id") @db.Uuid
  contractorId   String?     @map("contractor_id") @db.Uuid
  rateId         String      @map("rate_id") @db.Uuid
  amount         Decimal     @map("amount") @db.Decimal(12, 2)
  paymentType    PaymentType @map("payment_type")
  remarks        String?     @map("remarks") @db.VarChar(255)
  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamp
  updatedAt      DateTime    @updatedAt @map("updated_at") @db.Timestamp
  deletedAt      DateTime?   @map("deleted_at") @db.Timestamp

  site           Site         @relation(fields: [siteId], references: [id], onDelete: Cascade)
  vehicle        Vehicle      @relation(fields: [vehicleId], references: [id], onDelete: Restrict)
  materialType   MaterialType @relation(fields: [materialTypeId], references: [id], onDelete: Restrict)
  contractor     Contractor?  @relation(fields: [contractorId], references: [id], onDelete: Restrict)
  rate           Rate         @relation(fields: [rateId], references: [id], onDelete: Restrict)

  @@index([siteId, date])
  @@index([contractorId, date])
  @@index([vehicleId, date])
  @@index([deletedAt])
  @@index([date])
  @@map("loads")
}

model QuotaTransaction {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  quotaType       String   @map("quota_type") @db.VarChar(50)
  previousQuota   Int      @map("previous_quota")
  newQuota        Int      @map("new_quota")
  amountPaid      Decimal  @default(0.00) @map("amount_paid") @db.Decimal(10, 2)
  paymentRef      String?  @map("payment_ref") @db.VarChar(100)
  notes           String?  @map("notes") @db.VarChar(255)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamp

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("quota_transactions")
}
```
