# Implementation Plan — Hurdle 4: Frontend Foundation

## Overview
Establish the React/Vite frontend foundation for VLMS. This includes installing and configuring Tailwind CSS v4, setting up React Router v7, implementing a robust typed API client, creating a mobile-first responsive layout (with header and bottom navigation bar), and demonstrating end-to-end integration by querying and displaying live backend and database health from `GET /api/v1/health`.

## User Review Required
> [!NOTE]
> All plans and walkthroughs will be systematically archived under `docs/hurdles/hurdle-4/` in the repository.

## Proposed Changes

### 1. Frontend Dependencies & Tailwind CSS v4 Setup
- Install `@tailwindcss/vite`, `tailwindcss`, `react-router-dom`, and `lucide-react`.
- Configure `frontend/vite.config.ts` with `@tailwindcss/vite`.
- Update `frontend/src/styles.css` with Tailwind v4 `@import "tailwindcss";`, modern typography (Inter), glassmorphism utility classes, and custom mobile-first layout styles.
- Update `frontend/index.html` with viewport meta, font links, and title.

#### [MODIFY] [frontend/package.json](file:///Users/ajmal/Projects/VLMS/frontend/package.json)
#### [MODIFY] [frontend/vite.config.ts](file:///Users/ajmal/Projects/VLMS/frontend/vite.config.ts)
#### [MODIFY] [frontend/src/styles.css](file:///Users/ajmal/Projects/VLMS/frontend/src/styles.css)
#### [MODIFY] [frontend/index.html](file:///Users/ajmal/Projects/VLMS/frontend/index.html)

---

### 2. API Client & Typed Services
Create `frontend/src/api/`:
- **`client.ts`**: Reusable typed HTTP client supporting base URL resolution (`VITE_BACKEND_URL` / fallback `http://localhost:3000`), JSON envelope parsing (`{ success: true, data }`), and typed API error handling (`ApiError`).
- **`health.ts`**: Typed service calling `GET /api/v1/health` with auto-polling and retry capabilities.

#### [NEW] [frontend/src/api/client.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/client.ts)
#### [NEW] [frontend/src/api/health.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/api/health.ts)
#### [MODIFY] [frontend/src/vite-env.d.ts](file:///Users/ajmal/Projects/VLMS/frontend/src/vite-env.d.ts)

---

### 3. Mobile-First Layout & UI Components
Create `frontend/src/components/`:
- **`layout/AppLayout.tsx`**: Mobile-first scaffold with:
  - Top header displaying VLMS brand and real-time backend/database connection badge.
  - Responsive main viewport with safe padding.
  - Mobile bottom navigation bar (Dashboard, Loads, Reports, Settings) and desktop sidebar view.
- **`common/StatusBadge.tsx`**: Visual status badge for `online`, `offline`, and `checking` states.
- **`common/Card.tsx`**: Clean, accessible card container.

#### [NEW] [frontend/src/components/layout/AppLayout.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/layout/AppLayout.tsx)
#### [NEW] [frontend/src/components/common/StatusBadge.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/common/StatusBadge.tsx)
#### [NEW] [frontend/src/components/common/Card.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/components/common/Card.tsx)

---

### 4. Pages & Routing
Create `frontend/src/pages/`:
- **`DashboardPage.tsx`**: Landing screen with:
  - Quick action overview (Load Entry, Master Data, Reports).
  - Real-time System Connectivity Card (Backend status, PostgreSQL database status, latency in ms, uptime, and manual refresh button).
- **`NotFoundPage.tsx`**: Standard 404 page.
- **`App.tsx`**: Configures React Router with routes (`/`, `*`).
- **`main.tsx`**: Entrypoint mounting React root with BrowserRouter.

#### [NEW] [frontend/src/pages/DashboardPage.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/pages/DashboardPage.tsx)
#### [NEW] [frontend/src/pages/NotFoundPage.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/pages/NotFoundPage.tsx)
#### [NEW] [frontend/src/App.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/App.tsx)
#### [MODIFY] [frontend/src/main.tsx](file:///Users/ajmal/Projects/VLMS/frontend/src/main.tsx)

---

### 5. Archiving & Hurdle Tracking
- Save `docs/hurdles/hurdle-4/plan.md`.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 4 as `🔄 In Progress`.

#### [NEW] [docs/hurdles/hurdle-4/plan.md](file:///Users/ajmal/Projects/VLMS/docs/hurdles/hurdle-4/plan.md)
#### [MODIFY] [docs/DEVELOPMENT_HURDLES.md](file:///Users/ajmal/Projects/VLMS/docs/DEVELOPMENT_HURDLES.md)

---

## Verification Plan

### Automated / Command Verification:
1. **Frontend Compilation & Build:**
   ```bash
   npm run build --workspace=@vlms/frontend
   ```
2. **Full Workspace Build:**
   ```bash
   npm run build
   ```
3. **Container Health & Dev Server:**
   ```bash
   docker compose ps
   curl -i http://localhost:5173/
   ```
4. **End-to-End Browser Connectivity:**
   Test via browser subagent or curl to verify:
   - Frontend loads on `http://localhost:5173`.
   - Health status card displays `"System Operational"` with PostgreSQL status `"up"` and latency.
   - Mobile navigation and responsive layout render cleanly without console errors.
