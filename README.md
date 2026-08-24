# VLMS — Vehicle Load Management System
### Modern Multi-Tenant SaaS ERP for Quarry, Crusher & Mining Dispatch Operations

[![Tests](https://img.shields.io/badge/tests-50%2F50%20passing-emerald)](https://github.com/Ajmalka84/VLMS)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-red)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.0-cyan)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.0-sky)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16--Alpine-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Production%20Ready-2496ED)](https://www.docker.com/)

---

## 📖 Overview

**VLMS (Vehicle Load Management System)** is a purpose-built, multi-tenant SaaS ERP engineered specifically for aggregate quarries, granite crushers, and mining operators in India. 

Designed for high-speed weighbridge operations, VLMS replaces paper trip books and complex spreadsheets with **3-click load dispatching**, **instant rate matrix calculation**, **automated contractor credit settlement ledgers**, and **commercial SaaS subscription management**.

---

## ✨ Core Features & Modules

### 1. ⚡ Weighbridge Dispatch Cockpit (`/loads`)
- **3-Click Dispatch Recording**: Optimized for rugged weighbridge cabins and touchscreen tablets.
- **In-Memory Dynamic Rate Resolution**: Automatically calculates load pricing based on Quarry Site + Vehicle Type + Material Type in <1ms.
- **Payment Processing**: Supports both **CASH** (direct walk-in sales) and **CREDIT** (contractor account billing).
- **Relational Integrity Safeguards**: Protects active accounting records with soft-delete logging (`deletedAt`).
- **Vehicle Auto-Formatting**: Normalizes Indian vehicle registration plates (e.g. `KL07AB1234`) to standard uppercase.

### 2. 📊 Contractor Settlements & Reporting (`/reports`)
- **Live Settlement Statements**: Multi-dimensional breakdown of contractor trips, aggregate tonnage, materials, and total financial outstanding.
- **Custom Date Filters & Presets**: Quick filters (`Today`, `Yesterday`, `Last 7 Days`, `This Month`) and dual calendar date-range pickers.
- **Bilingual Settlement PDFs**: Generates professional billing statements in English and Malayalam with Indian Rupee words conversion (`numberToWordsINR`).
- **Excel & CSV Export**: 1-click sanitized data export matching the exact active date filters.
- **Joint Venture & Collaboration Headers**: Supports overriding quarry business names and joint phone numbers for partner quarries.

### 3. 🏗️ Quarry Master Data Management (`/settings`)
- **Global Specifications**: Master classification for Vehicle Types (e.g., *6-Wheeler Tipper*, *10-Wheeler*, *Taurus*) and Material Specifications (e.g., *20mm Aggregate*, *GSB*, *Manufactured Sand*).
- **Fleet & Contractor Directory**: Fast search, phone number indexing, and ownership tracking.
- **Active / Inactive Site Lifecycle**: Deactivate or archive closed quarry pits with 1-click without losing historical accounting ledgers.
- **Multi-Tier Rate Matrix**: Custom rate matrix per site, vehicle category, and material type.

### 4. 👑 Super Admin Platform & Subscriptions (`/admin/users`)
- **Direct Landing Page**: Super Admin logins route directly to the Customer Management Console.
- **Commercial Package Engine**:
  - **7-Day Free Pilot**: Automated onboarding with white-glove setup and countdown timers.
  - **Early Adopter Annual Package**: ₹9,999/year package with 1-Click Renew (`+1 Year`).
  - **Monsoon & Government Shutdown Extensions**: 1-Click validity compensation (`+30 Days`).
  - **Custom Validity & Grace Periods**: Manually configure specific expiration dates and grace period days.
- **Multi-Tenant Global Reports**: Super Admin can audit cross-tenant contractor summaries with customer ID overrides.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons, html2canvas, jsPDF |
| **Backend** | NestJS 11, Node.js (Alpine), Prisma ORM 7, Class-Validator, JWT, Bcrypt |
| **Database** | PostgreSQL 16 (Alpine), ACID Compliant with UUID Primary Keys & Multi-Tenant Partitioning |
| **Infrastructure** | Docker Compose, Alpine multi-stage builds, Nginx Reverse Proxy with Gzip & SSL |
| **Testing** | Node.js native test runner (`node --test`), 50+ Automated Unit & Integration Tests |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js**: v20.x or v22.x+
- **Docker & Docker Compose**: v2.20+
- **Git**

### Installation

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Ajmalka84/VLMS.git
   cd VLMS
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Start PostgreSQL & Development Containers**:
   ```bash
   docker compose up -d
   ```

4. **Install Dependencies & Run Migrations**:
   ```bash
   npm install
   cd backend && npx prisma migrate dev && cd ..
   ```

5. **Start Dev Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend App**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

---

## 🧪 Testing

The repository includes a comprehensive automated test suite covering authentication, multi-tenant isolation, rate calculation, loads ledger, contractor reports, and subscription lifecycles:

```bash
# Run all 50 unit and end-to-end integration tests
npm test
```

```bash
# Verify production TypeScript build across all workspaces
npm run build
```

---

## 🚢 Production Deployment

### Quick Production Launch (Docker Compose)

```bash
# 1. Build and launch production containers in detached mode
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 2. Deploy database migrations
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 3. Verify services
docker compose -f docker-compose.prod.yml ps
curl http://localhost:3000/api/v1/health
```

---

## 📦 Disaster Recovery & Automated Backups

VLMS includes automated database backup and disaster recovery scripts with a 90-day rolling retention policy:

```bash
# Create an instant database backup
bash scripts/backup.sh

# Restore from a backup dump
bash scripts/restore.sh backups/vlms_vlms_prod_YYYY-MM-DD_HHMMSS.dump
```

#### Automated Daily Cron (2:00 AM):
```bash
0 2 * * * cd /opt/vlms && bash scripts/backup.sh >> /var/log/vlms_backup.log 2>&1
```

---

## 📂 Project Structure

```
VLMS/
├── backend/                  # NestJS 11 REST API Application
│   ├── prisma/               # Prisma Schema & Database Migrations
│   │   └── schema.prisma
│   └── src/
│       ├── admin/            # Super Admin Customer & Subscription Engine
│       ├── auth/             # JWT & RBAC Authentication Guards
│       ├── contractors/      # Contractor Account Management
│       ├── loads/            # Dispatch Loads Ledger & Aggregations
│       ├── master-data/      # Vehicle & Material Classifications
│       ├── rates/            # Rate Matrix & In-Memory Lookup Engine
│       ├── reports/          # Contractor Settlements & Analytics
│       └── sites/            # Quarry Sites & Inactive Toggle
├── frontend/                 # React 19 SPA Frontend
│   └── src/
│       ├── api/              # API Client with In-Flight GET Deduplication
│       ├── components/       # CustomSelect, Cards, Modals, Nav Layouts
│       ├── context/          # AuthContext & Offline-First Cache Layer
│       ├── pages/            # Loads, Reports, MasterData, Admin Console
│       └── utils/            # INR Words, CSV Exporter, PDF Engine
├── nginx/                    # Production Nginx Configuration & Proxy
├── scripts/                  # Automated Backup & Disaster Recovery Scripts
├── tests/                    # E2E & Unit Test Suites (50/50 Passing)
└── docker-compose.prod.yml   # Production Container Orchestration
```

---

## 📄 License

Proprietary Software — Copyright © 2026 VLMS. All rights reserved.
