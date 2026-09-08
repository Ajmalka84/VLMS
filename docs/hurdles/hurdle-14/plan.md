# Hurdle 14: Full-Stack Modernization, Design System, PWA & Production-Grade Backend Engine

## Objectives

1. **Frontend Architecture & Design System Overhaul**:
   - Create a unified, modular UI component library (`Button`, `Card`, `Badge`, `CurrencyBadge`, `DateInput`, `CustomSelect`, `MultiSelect`, `Modal`, `ConfirmModal`, `FilterBar`, `PageHeader`, `Pagination`, `SearchBar`, `TabBar`, `MetricCard`, `EmptyState`, `ErrorBoundary`).
   - Eliminate dropdown clipping and z-index card overshadowing with floating portal positioning and fluid width flexing.
   - Standardize date picker interactions with anchor-based origin popovers.
   - Refactor all major pages (`LoadsPage`, `ExpensesPage`, `ReportsPage`, `ShiftDrawerPage`, `MasterDataPage`, `DashboardPage`, `CustomersPage`, `LoginPage`) to use the design system.

2. **Progressive Web App (PWA) & Offline Capabilities**:
   - Web App Manifest (`manifest.json`) for full standalone mobile app installation.
   - Service Worker (`sw.js`) with cache-first static asset caching and network-first API fallbacks.
   - App icons, favicon, Apple touch icons, and theme color meta tags.
   - Vite bundle optimization with manual chunk splitting.

3. **Backend SQL Aggregation Engine (Zero In-Memory Loops)**:
   - Convert in-memory JavaScript `.reduce()` loops in `LoadsService`, `ExpensesService`, `ShiftsService`, and `ReportsPartnerShareService` to native PostgreSQL Prisma `groupBy` and `aggregate` queries.
   - Achieve single-digit millisecond latency across all ledger, financial summary, and equity distribution queries.

4. **Multi-Tenant In-Memory Cache with LRU Eviction**:
   - `MasterCacheService`: Sub-millisecond master bundle and rate lookups with 2,000-entry capacity and Least-Recently-Used (LRU) eviction.
   - Mutation-based cache invalidation across all 8 master data entities.

5. **Prisma Error Normalization & Concurrency Hardening**:
   - `AllExceptionsFilter`: Native mapping of Prisma error codes (`P2002` $\rightarrow$ 409, `P2003` $\rightarrow$ 400, `P2025` $\rightarrow$ 404, `P2024` $\rightarrow$ 503) without leaking 500 server crashes.
   - Atomic `prisma.rate.upsert` in `LoadsService.create` to prevent race condition collisions.
   - Centralized query helpers in `query-builder.util.ts`.

6. **High-Performance Compound Database Indexing**:
   - Add composite indexes in `schema.prisma` for `Load`, `Expense`, and `ShiftReconciliation`.

7. **Contract Integrity & Test Verification**:
   - Preserve 100% of all existing API response contracts (`{ success: true, data }` / `{ success: false, message, code }`).
   - Validate 100% test pass rate across all 95 unit, integration, and E2E test suites.
