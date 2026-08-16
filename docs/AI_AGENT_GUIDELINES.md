# VLMS — AI Agent Guidelines

## 1. Purpose

This document defines how AI coding agents should work on the VLMS repository.

It applies to any AI coding agent, including:

* Codex
* Claude Code
* Cursor
* GitHub Copilot
* Other coding agents

The agent is an implementation assistant.

The product and architecture decisions remain under the control of the project owner.

---

# 2. Read Before Coding

Before making changes, read:

1. `docs/PRODUCT_DEFINITION.md`
2. `docs/DATABASE_SCHEMA.md`
3. `docs/API_DOCUMENTATION.md`
4. `docs/DEVELOPMENT_HURDLES.md`

Then inspect the existing repository.

Do not assume the repository is empty or in a clean state.

---

# 3. Source of Truth

Use the documents in this priority:

1. `PRODUCT_DEFINITION.md`
   → Business requirements

2. `DATABASE_SCHEMA.md`
   → Data model

3. `API_DOCUMENTATION.md`
   → API contract

4. `DEVELOPMENT_HURDLES.md`
   → Development order and verification

5. `AI_AGENT_GUIDELINES.md`
   → AI working rules

If existing code conflicts with the documentation, do not silently change the specification.

Report the conflict first.

---

# 4. Work One Hurdle at a Time

The current development hurdle is the only scope for the current task.

Do not implement future hurdles unless explicitly instructed.

Workflow:

```text
Current Hurdle
      ↓
Inspect
      ↓
Plan
      ↓
Implement
      ↓
Run
      ↓
Test
      ↓
Verify
      ↓
Update Status
      ↓
Next Hurdle
```

---

# 5. Inspect Before Modifying

Before changing code:

* Inspect repository structure.
* Inspect relevant files.
* Inspect package configuration.
* Inspect Docker configuration.
* Inspect Prisma configuration.
* Inspect environment configuration.
* Check current errors.
* Check what is already implemented.

Reuse correct existing code.

Do not rewrite working code unnecessarily.

---

# 6. Current Development Principle

The project must be developed incrementally.

Never:

> Build the entire application in one operation.

Instead:

```text
Foundation
↓
Verify
↓
Authentication
↓
Verify
↓
Master Data
↓
Verify
↓
Loads
↓
Verify
↓
Reports
↓
Verify
```

Every stage must be stable before the next stage begins.

---

# 7. Infrastructure Comes First

Before implementing business features, verify:

* Docker Compose
* PostgreSQL
* Backend
* Frontend
* Prisma
* Database migration
* Backend health endpoint
* Backend → Database
* Frontend → Backend

Required baseline:

```text
Frontend
    ↓
Backend
    ↓
Prisma
    ↓
PostgreSQL
```

If the infrastructure is broken, stop feature development and fix the infrastructure first.

---

# 8. Current Known Development Issue

The clean-slate infrastructure was verified during Hurdle 1.

Verified result:

* PostgreSQL starts and reports healthy in Docker.
* Backend and frontend start successfully in Docker.
* The backend has no restart loop.
* Backend and frontend endpoints respond successfully.

The next priority is the Prisma and PostgreSQL database foundation in
Hurdle 2. Do not start business modules until that foundation is stable.

---

# 9. Do Not Redesign the Product During Implementation

The following are already finalized for V1:

* One customer User account
* SUPER_ADMIN + USER roles
* Multiple Sites per User
* Vehicles belong to User
* Contractors/C/Os belong to User
* Loads belong to Site
* C/O belongs to Load
* Rate = Site + Vehicle Type + Material
* One current Rate per combination
* Load stores `rate_id`
* Load stores actual `amount`
* Reports use Load amounts
* Settlement PDF
* Mobile-first workflow

Do not change these decisions casually.

If a change appears necessary:

1. Explain the reason.
2. Identify the affected documents.
3. Stop before making a structural change.
4. Ask for confirmation.

---

# 10. Do Not Add Unnecessary Features

V1 does not include:

* Multiple customer users
* Complex roles
* Permissions matrix
* Organization/membership system
* Subscription billing
* Payment gateway
* Accounting
* GST filing
* Inventory
* Driver management
* GPS
* Maintenance
* WhatsApp integration
* AI features
* Advanced analytics

Do not implement these unless explicitly requested.

---

# 11. Database Rules

The database schema is defined in:

`docs/DATABASE_SCHEMA.md`

Use Prisma.

Do not introduce new tables unless required by a documented business requirement.

Avoid redundant fields.

Prefer deriving data through relationships.

Example:

```text
Load
 ↓
Vehicle
 ↓
Vehicle Type
```

Therefore do not duplicate Vehicle Type unnecessarily inside Load.

---

# 12. API Rules

The API contract is defined in:

`docs/API_DOCUMENTATION.md`

Do not invent different endpoint names unnecessarily.

Do not silently change request/response formats.

Business rules must be enforced in the backend.

The frontend must never be trusted for:

* ownership
* authorization
* rate calculation
* data integrity

---

# 13. Ownership and Security

Every customer-owned resource must be checked against the authenticated user.

Example:

```text
Authenticated User
        ↓
Requested Site
        ↓
Does Site.user_id match?
        ↓
Allow / Reject
```

Never trust a `userId` supplied by the frontend.

Never allow:

```text
User A
   ↓
change ID
   ↓
access User B's data
```

Cross-user access must be rejected.

---

# 14. Load Rules

When creating a Load:

1. Verify Site ownership.
2. Verify Vehicle ownership.
3. Verify Contractor ownership.
4. Get Vehicle Type from Vehicle.
5. Find Rate using:

   * Site
   * Vehicle Type
   * Material
6. If amount is omitted:

   * use Rate.amount
7. If amount is provided:

   * use provided amount
8. Store `rate_id`.
9. Store actual `amount`.

The frontend must not determine the Rate independently.

---

# 15. Report Rules

Reports are generated from Loads.

Use:

```text
SUM(load.amount)
```

for settlement totals.

Do not recalculate historical settlement amounts using the current Rate.

Deleted Loads must not appear in reports.

The PDF should use the same underlying report data as the JSON report API.

---

# 16. Coding Style

Prefer:

* TypeScript
* Small functions
* Clear names
* Reusable components
* Simple architecture
* Explicit business logic
* Strong typing

Avoid:

* `any`
* Duplicate logic
* Large unnecessary abstractions
* Magic values
* Dead code
* Unused imports
* Commented-out old code
* Unnecessary dependencies

---

# 17. Backend Rules

NestJS conventions should be followed.

Controllers:

* Receive requests
* Validate through DTOs
* Call services
* Return responses

Services:

* Contain business logic

Prisma:

* Handles database access

Do not put business logic into controllers.

---

# 18. Frontend Rules

Frontend:

* React
* Vite
* TypeScript
* Tailwind CSS

The UI is mobile-first.

The primary interaction is Load Entry.

Prioritize:

* Search
* Autocomplete
* Large touch targets
* Fast input
* Clear actions
* Minimal navigation

Do not duplicate backend business rules in the frontend.

---

# 19. Testing Rule

A feature is not complete because code was written.

It must be:

```text
Implemented
+
Build passes
+
Runtime works
+
API tested
+
Business rule verified
```

For important workflows, test realistic data.

Example:

* Multiple vehicles
* Multiple C/Os
* Multiple materials
* Multiple loads
* Different amounts
* Cash/Credit
* Edited loads
* Deleted loads
* Different sites

---

# 20. Verification Rule

After meaningful changes, run the appropriate checks.

Examples:

```text
docker compose config
docker compose ps
docker compose logs
npm run build
npm run test
npx prisma validate
npx prisma generate
npx prisma migrate
```

Use the package manager already configured in the repository.

Do not switch package managers unnecessarily.

---

# 21. Error Handling

When something fails, do not hide the error.

Identify:

* What failed?
* Where did it fail?
* Why did it fail?
* What evidence confirms the cause?
* What was changed?

Fix the root cause rather than adding random workarounds.

---

# 22. Dependency Changes

Do not add dependencies casually.

Before adding a dependency:

1. Check whether the project already has an existing solution.
2. Check whether the dependency is actually necessary.
3. Prefer the existing stack.
4. Keep the dependency footprint small.

---

# 23. File Changes

Keep changes focused.

A task should modify only the files needed for that task.

Do not perform unrelated refactoring while implementing a feature.

If a larger refactor becomes necessary, stop and explain why.

---

# 24. Database Changes

Never change the schema casually.

If a schema change is required:

1. Explain the reason.
2. Confirm whether it aligns with product requirements.
3. Update `DATABASE_SCHEMA.md`.
4. Update affected API documentation.
5. Create the migration.
6. Verify existing functionality.

---

# 25. API Changes

If an endpoint needs to change:

1. Identify why.
2. Check the product requirement.
3. Update `API_DOCUMENTATION.md`.
4. Update backend implementation.
5. Update frontend consumers.
6. Test the change.

Do not create undocumented API behavior.

---

# 26. AI Agent Reporting

At the end of each task, report:

```text
Task completed:
...

Files changed:
...

Implementation summary:
...

Tests/checks run:
...

Result:
...

Remaining issues:
...

Next recommended hurdle:
...
```

Keep the report factual.

Do not claim success without verification.

After completing or materially advancing a hurdle, append the factual
implementation record to `docs/HURDLE_IMPLEMENTATION_LOG.md`. Include the
files changed, repeatable commands/checks, errors and root-cause fixes,
verification evidence, handover notes, and next hurdle.

---

# 27. When Blocked

If blocked:

Do not continue randomly.

Report:

```text
BLOCKED

Problem:
...

Evidence:
...

Likely cause:
...

What was attempted:
...

What remains:
...
```

Then stop.

---

# 28. Hurdle Discipline

`docs/DEVELOPMENT_HURDLES.md` controls development order.

Before starting a task:

1. Identify the current hurdle.
2. Read its objective.
3. Read its verification criteria.
4. Implement only that hurdle.
5. Verify its Definition of Done.
6. Update the hurdle status.

Do not skip hurdles because later features appear easier.

---

# 29. Definition of Done

A hurdle is complete only when:

* Implementation exists
* Project builds
* Runtime works
* Relevant tests pass
* Business requirements are satisfied
* No known critical errors remain
* Verification criteria are satisfied
* `DEVELOPMENT_HURDLES.md` can be updated to DONE

---

# 30. Current Hurdle

Current hurdle:

## HURDLE 2 — DATABASE FOUNDATION

Current objective:

Establish the Prisma database layer and verify that PostgreSQL can be
created from scratch using the documented V1 schema.

Current priority:

**Prisma configuration, schema validation, generation, and initial migration.**

Required before moving forward:

* Prisma is configured for PostgreSQL
* The V1 schema is represented in Prisma
* Prisma generates successfully
* Initial migration works
* PostgreSQL contains the expected tables
* Backend can connect to PostgreSQL

---

# 31. Next Hurdles

After infrastructure:

1. Database Foundation
2. Backend Foundation
3. Frontend Foundation
4. Authentication
5. Super Admin
6. Master Data
7. Load Management
8. Settlement Reports
9. PDF
10. End-to-End Testing
11. Deployment
12. Real Customer Validation

---

# 32. Final Principle

The AI agent is responsible for implementation.

The project owner is responsible for product decisions.

The documentation is the contract between them.

The agent should:

**Understand → Implement → Verify → Report**

not:

**Guess → Generate everything → Hope it works**

Build VLMS one verified hurdle at a time.
