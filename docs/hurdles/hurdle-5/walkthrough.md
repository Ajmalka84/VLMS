# Walkthrough — Hurdle 5: Authentication

## Status: ✅ Completed

Hurdle 5 established secure authentication, password hashing with bcrypt, JWT bearer token verification, role guards (`SUPER_ADMIN` and `USER`), account active-state checks, and a complete frontend authentication layer with session persistence and a mobile login UI.

---

## 1. Components Implemented

### Backend Authentication Architecture
* **Bcrypt Password Hashing**: Passwords stored in PostgreSQL `users.password_hash` are hashed with salt rounds = 10 and compared via `bcryptjs.compare`.
* **Super Admin & Customer User Credentials**:
  * **Super Admin**: Authenticates against secure environment credentials (`SUPER_ADMIN_MOBILE` and `SUPER_ADMIN_PASSWORD`). Issues JWT with `role: "SUPER_ADMIN"`.
  * **Customer Users**: Queries PostgreSQL `users` table, validates password, checks `isActive` flag, and issues JWT with `role: "USER"`, `businessName`, and `mobile`.
* **Active Status Enforcement**: Inactive accounts (`isActive = false`) receive HTTP 403 Forbidden with `"Account is inactive. Please contact the administrator."`.
* **Passport JWT Strategy & Guards**:
  * `JwtStrategy`: Resolves and validates Bearer token from `Authorization` header.
  * `JwtAuthGuard`: Enforces token authentication except for routes decorated with `@Public()`.
  * `RolesGuard`: Restricts endpoints to specified `@Roles('SUPER_ADMIN' | 'USER')`.
  * `@CurrentUser()`: Custom parameter decorator providing type-safe `AuthUser` in handlers.
* **Core Endpoints**:
  * `POST /api/v1/auth/login` (Public): Authenticates and issues JWT token.
  * `GET /api/v1/auth/me` (Protected): Returns active user profile and role.

### Frontend Authentication Layer
* **`apiClient` Automatic Bearer Token**: Automatically injects stored JWT token from `localStorage` into all API calls.
* **`AuthContext` & `AuthProvider`**: Manages auth state (`user`, `token`, `isAuthenticated`, `isLoading`, `login`, `logout`), restoring session on startup via `/auth/me`.
* **`ProtectedRoute`**: Guards private routes, showing a verification loader during initial check and redirecting unauthenticated users to `/login`.
* **`LoginPage`**: Modern mobile-first login screen with responsive validation, show/hide password toggle, error alert messaging, and quick-fill test credentials for Super Admin (`9999999999`) and Customer User (`9876543210`).
* **`AppLayout` Integration**: Displays user business name/mobile, role badge (`Super Admin` / `Customer`), and Sign Out button.

---

## 2. Verification Evidence

### 1. Super Admin Login & `/auth/me`
```bash
# Login as Super Admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"Admin@12345"}'
```
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "00000000-0000-0000-0000-000000000001",
      "mobile": "9999999999",
      "role": "SUPER_ADMIN",
      "businessName": "VLMS SaaS Admin",
      "isActive": true
    }
  }
}
```

```bash
# Call Protected /auth/me
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/v1/auth/me
```
```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "mobile": "9999999999",
    "role": "SUPER_ADMIN",
    "businessName": "VLMS SaaS Admin",
    "isActive": true
  }
}
```

### 2. Invalid Login & Unauthorized Protection
```bash
# Bad Password: HTTP 401 Unauthorized
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"wrongpassword"}'
```
```json
{
  "success": false,
  "message": "Invalid mobile number or password",
  "code": "UNAUTHORIZED"
}
```

```bash
# Unauthenticated /auth/me: HTTP 401 Unauthorized
curl http://localhost:3000/api/v1/auth/me
```
```json
{
  "success": false,
  "message": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

### 3. Database Customer User & Inactive Account Rejection
```json
// Inactive user login rejection (HTTP 403 Forbidden)
{
  "success": false,
  "message": "Account is inactive. Please contact the administrator.",
  "code": "FORBIDDEN"
}
```

### 4. Workspace Build
```bash
npm run build
```
```
> @vlms/backend@0.1.0 build
> nest build

> @vlms/frontend@0.1.0 build
> tsc -b && vite build
✓ built in 273ms
```

---

## 3. Handover & Next Hurdle
Authentication is complete and verified across all layers. We are now ready to proceed to **Hurdle 6 — Super Admin** (Customer creation `POST /api/v1/admin/users`, listing `GET /api/v1/admin/users`, status toggling, password resets, and the Super Admin management dashboard).
