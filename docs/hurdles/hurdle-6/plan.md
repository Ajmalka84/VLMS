# Implementation Plan — Hurdle 6: Super Admin

## Overview
Implement the Super Admin customer onboarding and management capabilities for the SaaS owner. This includes backend CRUD and operational endpoints (`POST /api/v1/admin/users`, `GET /api/v1/admin/users`, `GET /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id`, `PATCH /api/v1/admin/users/:id/status`, `POST /api/v1/admin/users/:id/reset-password`), strict role authorization with `@Roles('SUPER_ADMIN')`, and a dedicated mobile-first Super Admin customer management UI.

## User Review Required
> [!NOTE]
> All plans and walkthroughs will be systematically archived under `docs/hurdles/hurdle-6/` in the repository.

## Proposed Changes

### 1. Backend Super Admin Users Module
Create `backend/src/admin/`:
- **`dto/create-user.dto.ts`**: Validates `businessName`, `mobile` (10-digit validation), `password` (min 6 chars), optional `gstin`.
- **`dto/update-user.dto.ts`**: Optional `businessName`, `gstin`.
- **`dto/update-user-status.dto.ts`**: Validates `isActive` boolean.
- **`dto/reset-password.dto.ts`**: Validates `newPassword` (min 6 chars).
- **`dto/query-users.dto.ts`**: Search query, status filter (`all`, `active`, `inactive`), pagination.
- **`admin-users.service.ts`**:
  - `createUser()`: Checks for mobile collisions, hashes password with bcrypt, persists to PostgreSQL.
  - `listUsers()`: Supports search by business name / mobile, filters by status, returns paginated list.
  - `getUserById()`: Fetches customer details or returns `404 Not Found`.
  - `updateUser()`: Updates business name and GSTIN.
  - `updateUserStatus()`: Toggles `isActive`.
  - `resetPassword()`: Securely hashes new password and updates `passwordHash`.
- **`admin-users.controller.ts`**:
  - Route prefix `/admin/users`.
  - Guarded with `JwtAuthGuard` and `RolesGuard` with `@Roles('SUPER_ADMIN')`.
- **`admin.module.ts`**: Bundles controller and service, imported into `app.module.ts`.

#### [NEW] [backend/src/admin/dto/create-user.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/dto/create-user.dto.ts)
#### [NEW] [backend/src/admin/dto/update-user.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/dto/update-user.dto.ts)
#### [NEW] [backend/src/admin/dto/update-user-status.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/dto/update-user-status.dto.ts)
#### [NEW] [backend/src/admin/dto/reset-password.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/dto/reset-password.dto.ts)
#### [NEW] [backend/src/admin/dto/query-users.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/dto/query-users.dto.ts)
#### [NEW] [backend/src/admin/admin-users.service.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/admin-users.service.ts)
#### [NEW] [backend/src/admin/admin-users.controller.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/admin-users.controller.ts)
#### [NEW] [backend/src/admin/admin.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/admin/admin.module.ts)
#### [MODIFY] [backend/src/app.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/app.module.ts)

---

### 2. Frontend Super Admin API Client & UI
- **`frontend/src/api/admin.ts`**: Typed client methods for `/admin/users` operations.
- **`frontend/src/pages/admin/CustomersPage.tsx`**:
  - Customer statistics cards (Total, Active, Inactive).
  - "Onboard Customer" dialog with form validation.
  - Search & filter controls (search by name/mobile, filter by active/inactive).
  - Responsive customer cards and table with quick actions:
    - Status toggle (Activate / Deactivate) with confirmation.
    - Password Reset dialog with auto-generator.
    - Edit Customer dialog.
- **`frontend/src/components/layout/AppLayout.tsx`**:
  - Dynamic navigation items: Super Admin sees "Customers" (`/admin/users`) and "Dashboard", while Customer users see operational links.
- **`frontend/src/App.tsx`**:
  - Register `/admin/users` route protected with `allowedRoles={['SUPER_ADMIN']}`.

#### [NEW] [frontend/src/api/admin.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/admin.ts)
#### [NEW] [frontend/src/pages/admin/CustomersPage.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/pages/admin/CustomersPage.tsx)
#### [MODIFY] [frontend/src/components/layout/AppLayout.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/layout/AppLayout.tsx)
#### [MODIFY] [frontend/src/App.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/App.tsx)

---

### 3. Per-Hurdle Archiving & Tracking
- Save `docs/hurdles/hurdle-6/plan.md`.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 6 as `🔄 In Progress`.

#### [NEW] [docs/hurdles/hurdle-6/plan.md](file:///Users/ajmal/Projects/VLMS/docs/hurdles/hurdle-6/plan.md)
#### [MODIFY] [docs/DEVELOPMENT_HURDLES.md](file:///Users/ajmal/Projects/VLMS/docs/DEVELOPMENT_HURDLES.md)

---

## Verification Plan

### Automated / Command Verification:
1. **Workspace Build:**
   ```bash
   npm run build
   ```
2. **Super Admin Authorization Check:**
   - Attempt `GET /api/v1/admin/users` as Customer User (`role: USER`) -> Expect HTTP 403 Forbidden.
   - Attempt `GET /api/v1/admin/users` as Super Admin (`role: SUPER_ADMIN`) -> Expect HTTP 200 with user list.
3. **Customer Onboarding Workflow:**
   - Super Admin creates a customer via `POST /api/v1/admin/users` (`{"businessName":"Titan Earthmovers", "mobile":"9123456789", "password":"TitanPass@123", "gstin":"29ABCDE9999F1Z5"}`).
   - Verify customer appears in `GET /api/v1/admin/users`.
   - Login as `9123456789` with `TitanPass@123` via `POST /api/v1/auth/login` -> Expect HTTP 201 with `role: "USER"` and `businessName: "Titan Earthmovers"`.
4. **Status Deactivation Workflow:**
   - Super Admin calls `PATCH /api/v1/admin/users/:id/status` with `{"isActive": false}`.
   - Attempt login as deactivated customer -> Expect HTTP 403 Forbidden (`Account is inactive...`).
   - Super Admin calls `PATCH /api/v1/admin/users/:id/status` with `{"isActive": true}`.
   - Login again -> Expect success.
5. **Password Reset Workflow:**
   - Super Admin resets customer password via `POST /api/v1/admin/users/:id/reset-password` with `{"newPassword":"NewTitanPass@456"}`.
   - Old password login -> Expect HTTP 401 Unauthorized.
   - New password login -> Expect HTTP 201 Success.
6. **Frontend UI Flow:**
   - Log in as Super Admin in browser.
   - Open Customers tab (`/admin/users`).
   - Onboard a customer through UI form, toggle status, and test reset password.
