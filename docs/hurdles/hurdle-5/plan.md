# Implementation Plan — Hurdle 5: Authentication

## Overview
Implement the complete authentication system for VLMS. This establishes password hashing with bcrypt, JWT token generation, role-based authorization (`SUPER_ADMIN` and `USER`), active status verification, NestJS guards/decorators (`JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`), the core auth endpoints (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`), and the frontend authentication layer (Login screen, AuthContext, token management, and ProtectedRoute).

## User Review Required
> [!NOTE]
> All plans and walkthroughs will be systematically archived under `docs/hurdles/hurdle-5/` in the repository.

## Proposed Changes

### 1. Backend Dependencies & Environment Variables
- Add `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`, `bcryptjs`, and `@types/bcryptjs` to `backend/package.json`.
- Add JWT and Super Admin configuration defaults to `.env.example`, `.env`, and `docker-compose.yml`:
  - `JWT_SECRET=vlms_super_secret_jwt_key_2026`
  - `JWT_EXPIRES_IN=7d`
  - `SUPER_ADMIN_MOBILE=9999999999`
  - `SUPER_ADMIN_PASSWORD=Admin@12345`

#### [MODIFY] [backend/package.json](file:///Users/ajmal/Projects/VLMS/backend/package.json)
#### [MODIFY] [docker-compose.yml](file:///Users/ajmal/Projects/VLMS/docker-compose.yml)
#### [MODIFY] [.env.example](file:///Users/ajmal/Projects/VLMS/.env.example)

---

### 2. Backend Auth Module & Guards
Create `backend/src/auth/`:
- **`auth.module.ts`**: Imports `PassportModule`, `JwtModule`, and `PrismaModule`.
- **`auth.service.ts`**:
  - `validateUser(mobile, password)`: Verifies credentials for Super Admin or checks `users` table via `bcryptjs.compare`.
  - Rejects inactive accounts (`isActive: false`) with `ForbiddenException`.
  - `login(user)`: Issues signed JWT token with payload `{ sub, mobile, role, businessName }`.
  - `getMe(userId, role)`: Returns authenticated user profile.
- **`auth.controller.ts`**:
  - `POST /api/v1/auth/login` (Public)
  - `GET /api/v1/auth/me` (Protected)
- **`dto/login.dto.ts`**: Validates `mobile` and `password`.
- **`strategies/jwt.strategy.ts`**: Validates JWT bearer tokens.
- **`guards/jwt-auth.guard.ts`**: Global/route guard respecting `@Public()`.
- **`guards/roles.guard.ts`**: Enforces `@Roles('SUPER_ADMIN' | 'USER')`.
- **`decorators/roles.decorator.ts`**, **`decorators/public.decorator.ts`**, **`decorators/current-user.decorator.ts`**.

#### [NEW] [backend/src/auth/auth.module.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/auth.module.ts)
#### [NEW] [backend/src/auth/auth.service.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/auth.service.ts)
#### [NEW] [backend/src/auth/auth.controller.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/auth.controller.ts)
#### [NEW] [backend/src/auth/dto/login.dto.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/dto/login.dto.ts)
#### [NEW] [backend/src/auth/strategies/jwt.strategy.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/strategies/jwt.strategy.ts)
#### [NEW] [backend/src/auth/guards/jwt-auth.guard.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/guards/jwt-auth.guard.ts)
#### [NEW] [backend/src/auth/guards/roles.guard.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/guards/roles.guard.ts)
#### [NEW] [backend/src/auth/decorators/roles.decorator.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/decorators/roles.decorator.ts)
#### [NEW] [backend/src/auth/decorators/public.decorator.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/decorators/public.decorator.ts)
#### [NEW] [backend/src/auth/decorators/current-user.decorator.ts](file:///Users/ajmal/Projects/VLMS/backend/src/auth/decorators/current-user.decorator.ts)

---

### 3. Frontend Auth Layer & Login UI
- **`frontend/src/api/client.ts`**: Attach `Authorization: Bearer <token>` automatically to outgoing requests if a token exists in storage.
- **`frontend/src/api/auth.ts`**: API methods for `login` and `getMe`.
- **`frontend/src/context/AuthContext.tsx`**: Manages auth state (`user`, `token`, `isAuthenticated`, `isLoading`, `login`, `logout`).
- **`frontend/src/components/auth/ProtectedRoute.tsx`**: Protects private routes and checks role authorization.
- **`frontend/src/pages/LoginPage.tsx`**: Mobile-first login screen with brand header, input validation, and role quick-fill testing buttons.
- **`frontend/src/components/layout/AppLayout.tsx`**: Displays logged-in user details (`businessName`, role badge) and sign-out button.
- **`frontend/src/App.tsx`**: Wraps routes in `AuthProvider` and `ProtectedRoute`.

#### [NEW] [frontend/src/api/auth.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/auth.ts)
#### [NEW] [frontend/src/context/AuthContext.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/context/AuthContext.tsx)
#### [NEW] [frontend/src/components/auth/ProtectedRoute.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/auth/ProtectedRoute.tsx)
#### [NEW] [frontend/src/pages/LoginPage.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/pages/LoginPage.tsx)
#### [MODIFY] [frontend/src/api/client.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/client.ts)
#### [MODIFY] [frontend/src/components/layout/AppLayout.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/layout/AppLayout.tsx)
#### [MODIFY] [frontend/src/App.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/App.tsx)

---

### 4. Per-Hurdle Documentation Archiving
- Create `docs/hurdles/hurdle-5/plan.md`.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 5 as `🔄 In Progress`.

#### [NEW] [docs/hurdles/hurdle-5/plan.md](file:///Users/ajmal/Projects/VLMS/docs/hurdles/hurdle-5/plan.md)
#### [MODIFY] [docs/DEVELOPMENT_HURDLES.md](file:///Users/ajmal/Projects/VLMS/docs/DEVELOPMENT_HURDLES.md)

---

## Verification Plan

### Automated / Command Verification:
1. **Workspace Compilation:**
   ```bash
   npm run build
   ```
2. **Super Admin Login API Test:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"mobile":"9999999999","password":"Admin@12345"}'
   ```
   *Expected:* Returns JWT token with `role: "SUPER_ADMIN"`.
3. **Invalid Password Test:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"mobile":"9999999999","password":"wrongpassword"}'
   ```
   *Expected:* HTTP 401 Unauthorized with `{ success: false, code: "UNAUTHORIZED" }`.
4. **Protected `/auth/me` Endpoint Test:**
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/v1/auth/me
   ```
   *Expected:* HTTP 200 with user profile.
5. **Customer User Creation & Inactive Test:**
   - Seed a test customer user with bcrypt hashed password.
   - Test successful customer login (`role: "USER"`).
   - Set `isActive = false` on user and verify login returns HTTP 403 Forbidden with `{ success: false, message: "Account is inactive..." }`.
6. **Frontend Authentication Flow:**
   - Verify unauthenticated visit redirects to `/login`.
   - Verify logging in persists session and renders dashboard.
   - Verify logging out clears state and redirects to `/login`.
