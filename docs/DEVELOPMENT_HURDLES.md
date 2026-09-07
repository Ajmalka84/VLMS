# VLMS — Development Hurdles

## Purpose

This document defines the order in which VLMS is developed,
verified, and delivered.

Each hurdle must be completed and verified before moving to
the next hurdle.

The goal is not simply to write code.

The goal is to progressively prove that the complete product works.

---

# Development Flow

Product Definition
        ↓
Project Infrastructure
        ↓
Database Foundation
        ↓
Backend Foundation
        ↓
Frontend Foundation
        ↓
Authentication
        ↓
Super Admin
        ↓
Master Data
        ↓
Load Management
        ↓
Reports
        ↓
PDF
        ↓
End-to-End Testing
        ↓
Deployment
        ↓
Real Customer Validation


# Status Legend

⬜ Not Started
🔄 In Progress
🟡 Blocked
✅ Done


# HURDLE 0 — PRODUCT DEFINITION

Status: ✅ Done

## Objective

Clearly define what VLMS is, who it serves, the business
workflow, and the V1 scope.

## Includes

- Customer problem
- Target customer
- User model
- Load workflow
- Rate workflow
- Settlement workflow
- V1 scope
- V1 exclusions

## Dependency

None.

## Verification

The complete product can be explained clearly without discussing
implementation.

## Definition of Done

- Product Definition completed
- V1 scope frozen
- Core workflow understood


# HURDLE 1 — PROJECT INFRASTRUCTURE

Status: ✅ Done

## Objective

Create a reliable development environment in which all project
components can run consistently.

## Includes

- Repository structure
- Frontend project
- Backend project
- Docker Compose
- Environment configuration
- Git configuration

## Dependency

Hurdle 0.

## Verification

A clean project startup should work without manual fixes.

## Definition of Done

- Frontend starts
- Backend starts
- Docker Compose starts
- Configuration loads correctly
- No restart loops
- Project structure is understood

## Current Issue

Resolved during Hurdle 1: the newly scaffolded backend, frontend, and
PostgreSQL services start successfully in Docker with no restart loop.


# HURDLE 2 — DATABASE FOUNDATION

Status: ✅ Done

## Objective

Establish a reliable PostgreSQL + Prisma database layer.

## Includes

- PostgreSQL container
- Prisma configuration
- Database connection
- Prisma generation
- Initial migration
- Database schema

## Dependency

Hurdle 1.

## Verification

Database can be created from scratch and accessed by Prisma.

## Definition of Done

- PostgreSQL starts
- Prisma generates
- Migration succeeds
- Database contains expected tables
- Backend can connect to database


# HURDLE 3 — BACKEND FOUNDATION

Status: ✅ Done

## Objective

Create a stable NestJS API foundation before implementing
business modules.

## Includes

- API versioning
- Configuration
- Global validation
- Error handling
- Health endpoint
- Prisma integration

## Dependency

Hurdle 2.

## Verification

GET /api/v1/health

Expected:

Backend is running and database is reachable.

## Definition of Done

- Backend starts reliably
- Health endpoint works
- Database connectivity verified
- Validation works
- Errors are handled consistently


# HURDLE 4 — FRONTEND FOUNDATION

Status: ✅ Done

## Objective

Create the basic React application and establish communication
with the backend.

## Includes

- React/Vite
- Tailwind
- Routing
- API client
- Environment configuration
- Basic application layout

## Dependency

Hurdle 3.

## Verification

Frontend successfully calls:

GET /api/v1/health

## Definition of Done

Browser
→ Frontend
→ Backend
→ Database

works successfully.


# HURDLE 5 — AUTHENTICATION

Status: ✅ Done

## Objective

Secure the application and establish the USER/SUPER_ADMIN model.

## Includes

- Password hashing
- Login
- JWT
- Auth guard
- Role guard
- /auth/me
- Active/inactive users

## Dependency

Hurdles 3 and 4.

## Verification

Test:

- Valid login
- Invalid login
- JWT protected endpoint
- Invalid JWT
- SUPER_ADMIN access
- USER access
- Inactive USER

## Definition of Done

Users can securely login and access only the APIs allowed
for their role.


# HURDLE 6 — SUPER ADMIN

Status: ✅ Done

## Objective

Allow the SaaS owner to onboard and manage customers.

## Includes

- Create User
- List Users
- View User
- Update User
- Activate/deactivate
- Reset password

## Dependency

Hurdle 5.

## Verification

Create a real test customer and login using that account.

## Definition of Done

A customer can be onboarded without manually modifying
the database.


# HURDLE 7 — MASTER DATA

Status: ✅ Done

## Objective

Allow customers to configure the information required for
load entry.

## Includes

- Sites
- Vehicles
- Vehicle Types
- Materials
- C/Os
- Rates

## Dependency

Hurdle 6.

## Verification

Create a complete test setup:

Site
→ Vehicle Type
→ Vehicle
→ Material
→ C/O
→ Rate

## Definition of Done

A customer can completely configure their operating environment.


# HURDLE 8 — LOAD MANAGEMENT

Status: ✅ Done

## Objective

Implement the core VLMS transaction: recording a vehicle load.

## Includes

- Create Load
- Rate lookup
- Automatic amount
- Amount override
- View Loads
- Edit Loads
- Delete Loads
- Search/filter

## Dependency

Hurdle 7.

## Verification

Create multiple real-world test loads.

Verify:

Vehicle
→ Vehicle Type
→ Site
→ Material
→ Rate
→ Amount
→ C/O

## Definition of Done

An operator can record and correct loads quickly and reliably.


# HURDLE 9 — SETTLEMENT REPORTS

Status: ✅ Done

## Objective

Turn Load data into a useful C/O settlement report.

## Includes

- Site filter
- C/O filter
- Date range
- Load aggregation
- Total loads
- Total amount

## Dependency

Hurdle 8.

## Verification

Manually calculate a test settlement and compare it with
the API result.

## Definition of Done

Report totals exactly match the underlying Load data.


# HURDLE 10 — PDF REPORT

Status: ✅ Done

## Objective

Allow customers to generate a professional settlement PDF.

## Includes

- Business information
- Site information
- C/O information
- Date range
- Load details
- Totals

## Dependency

Hurdle 9.

## Verification

Generate PDF from a known test report and verify its contents.

## Definition of Done

Customer can generate and share/print a correct settlement PDF.


# HURDLE 11 — END-TO-END TESTING & SYSTEM HARDENING

Status: ✅ Done

## Objective

Verify the complete system as a real customer would use it, perform full-stack hardening, eliminate redundant API calls, and resolve edge cases.

## Main Scenario

Super Admin
→ Create Customer
→ Customer Login
→ Configure Site
→ Add Master Data
→ Configure Rates
→ Create Loads
→ Edit/Delete Loads
→ Generate Report
→ Generate PDF

## Also Test

- Invalid login
- Inactive user
- Duplicate vehicle
- Duplicate rate
- Missing rate
- Invalid load
- Cross-user access
- Deleted load in report
- Incorrect date filters

## Definition of Done

Complete V1 workflow works without critical defects.


# HURDLE 12 — PRODUCTION DEPLOYMENT

Status: ✅ Done

## Objective

Make VLMS available to real customers with ultra-low hosting costs (~₹350/mo), high reliability, and automated 90-day backups.

## Includes

- Production frontend (Multi-stage Nginx Alpine with gzip compression)
- Production backend (Multi-stage Node 24 Alpine with precompiled TypeScript)
- Production database (PostgreSQL 16 Alpine with isolated private network)
- Secure Environment template (.env.production.example)
- HTTPS / Cloudflare DNS & SSL Guide
- Nginx Reverse Proxy Gateway (nginx.prod.conf)
- Automated 90-Day Database Backup & Disaster Recovery Scripts (backup.sh, restore.sh)
- Complete Step-by-Step Production Deployment Guide (docs/PRODUCTION_DEPLOYMENT_GUIDE.md)

## Dependency

Hurdle 11.

## Definition of Done

Production architecture and deployment configuration fully prepared, tested, and documented.


# HURDLE 13 — MULTI-ROLE COLLABORATION, EXPENSES & FINANCIAL INTELLIGENCE

Status: 🔄 In Progress

## Objective

Transform VLMS into a multi-role collaborative platform supporting Quarry Owners, Co-Partners (with time-sliced equity shares), and Site Boys (with 1-to-1 site assignments), with tenant-scoped masters, heavy machinery hourly rental logging, cash drawer reconciliations, and multi-site profit sharing intelligence.

## Parts Breakdown

- **Part 1**: Database Migration & Multi-Tenant Scoping Engine (Prisma schema with temporal shares, expenses, machinery, quotas, and auth context refactor)
- **Part 2**: Sub-Accounts & Quota Management Subsystem (Owner sub-account UI, quota limits [3 CPs, 2 SBs], Super Admin overrides)
- **Part 3**: Expenses, Machinery/Hitachi Hours & Advance Engine (Categories, machine masters, working hour calculator with overnight rollover, advance tracking)
- **Part 4**: Role-Based App Experience & Site Boy Field Workflow (Role navigation, site locking, global vehicle/contractor registration, shift drawer close)
- **Part 5**: Advanced Financial Reports & Cashflow Subsystem (Site cashflow statement, temporal partner profit-sharing statement, machine settlement, multi-format export)

## Dependency

Hurdle 12.

## Definition of Done

All 5 parts fully implemented, tested, verified with automated test suites, and documented in `docs/hurdles/hurdle-13/`.


# HURDLE 14 — REAL CUSTOMER VALIDATION

Status: ⬜ Not Started

## Objective

Validate VLMS against actual customer usage in live quarry operations.

## Process

Deploy to production and observe real-world dispatch recording, heavy machinery hourly logs, cash drawer balances, and contractor/partner settlement workflows.

## Definition of Done

First customer completes real-world operational workflows across Owner, Co-Partner, and Site Boy roles without critical defects.


# CURRENT DEVELOPMENT STATE

Current hurdle:

HURDLE 13 — MULTI-ROLE COLLABORATION, EXPENSES & FINANCIAL INTELLIGENCE (PART 4: ROLE-BASED APP EXPERIENCE & SITE BOY FIELD WORKFLOW)

Current blocker:

None.

Immediate goal:

Implement Part 4: Role-Based App Experience & Site Boy Field Workflow.


# DEVELOPMENT RULES

1. Complete one hurdle at a time.

2. Do not start the next hurdle until the current hurdle's
   Definition of Done is satisfied.

3. Do not add features outside the current hurdle.

4. Do not redesign finalized product requirements without
   discussing the reason first.

5. Fix root causes rather than hiding errors.

6. Test every significant change.

7. Keep the system as simple as possible.

8. Prefer working software over additional features.

9. Update this document whenever a hurdle changes status.

10. Record important architectural/business decisions when
    they are discovered during implementation.


# HURDLE COMPLETION RULE

A hurdle is not complete because:

- Code was written
- The agent says it is finished
- The application compiled once

A hurdle is complete only when:

IMPLEMENTED
+
RUNNING
+
TESTED
+
VERIFIED
+
DEFINITION OF DONE SATISFIED
