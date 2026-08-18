# Implementation Plan — Hurdle 10: PDF Report (Professional Settlement PDF Export)

## Overview
Enable quarry owners and transport supervisors to generate, preview, and download a professional, standalone **PDF Settlement Statement** (`.pdf`) directly onto their mobile phone or PC for WhatsApp sharing, email delivery, and accounting archives.

---

## User Review Required
> [!IMPORTANT]
> **PDF Export Capabilities:**
> 1. **1-Click "Download PDF (PDF ഡൗൺലോഡ്)" Button:**
>    - Generates a standalone, vector-crisp `.pdf` file (e.g. `Settlement_Southern_Logistics_18Aug2026.pdf`).
>    - Works instantly offline/in-browser without sending sensitive accounting data to third-party PDF cloud rendering servers.
> 2. **Professional Invoice Layout Structure:**
>    - **Header**: Quarry / Customer Business Name, Contact Phone, GSTIN.
>    - **Document Title**: `CONTRACTOR SETTLEMENT STATEMENT` / `സെറ്റിൽമെന്റ് സ്റ്റേറ്റ്‌മെന്റ്`.
>    - **Meta Details**: Billed-To Contractor Name, Mobile Number, Statement Period, Generated Date & Time.
>    - **Summary Table / KPI Box**: Total Dispatches, Gross Billed (₹), Cash Received (₹), **Net Credit Balance Due (₹)**.
>    - **Material Volume Summary**: Table with Material Name, Trips Count, and Subtotals.
>    - **Itemized Dispatch Table**: Trip #, Date, Vehicle No, Material, Site, Payment Mode (CASH/CREDIT), Rate (₹).
>    - **Signature Section**: Official signature blocks for "Authorized Signatory" and "Contractor / Driver Acknowledgment".
> 3. **Dual Export Modes on Reports Page:**
>    - 📄 **Download PDF File** (For saving & sharing on WhatsApp).
>    - 🖨️ **Print Slip / Paper Print** (For on-site thermal / paper receipt printing).

---

## Proposed Changes

### 1. PDF Generation Service (`frontend/src/utils/pdfGenerator.ts`)
Create a dedicated client-side vector PDF generation module utilizing `jspdf` and `jspdf-autotable`:
- **Function `generateSettlementPdf(data, options)`**:
  - Sets up standard A4 portrait document (210mm x 297mm).
  - Draws clean business header with dark slate accent lines (`#0f172a`, `#f59e0b`).
  - Draws metadata table (Contractor Name, Phone, Period).
  - Draws financial summary table with high-contrast bold net balance.
  - Draws material breakdown table if multiple materials exist.
  - Draws full itemized dispatches table with automated multi-page headers and footers ("Page X of Y").
  - Draws signature block at the end of document.
  - Triggers browser file download with sanitized filename: `Settlement_<ContractorName>_<Date>.pdf`.

### 2. Update Reports Page UI (`frontend/src/pages/ReportsPage.tsx`)
- Add **"Download PDF"** button alongside the existing **"Print / Slip"** and **"Export CSV"** buttons in the statement view.
- Show instant progress feedback using `toast.info('Generating PDF...')` and `toast.success('PDF downloaded successfully!')`.

### 3. Per-Hurdle Archiving
- Archive plan in `docs/hurdles/hurdle-10/plan.md`.
- Update `docs/DEVELOPMENT_HURDLES.md` marking Hurdle 10 as `🔄 In Progress`.

---

## Verification Plan

### Automated / Build Verification
1. Verify clean build:
   ```bash
   npm run build
   ```
2. Verify TypeScript type safety with `jspdf` and `jspdf-autotable`.

### Manual Browser Verification
1. Open `http://localhost:5173/reports`.
2. Click **"Generate Statement"** for any contractor.
3. Tap **"Download PDF"**:
   - Verify file downloads as a valid `.pdf` file.
   - Open PDF in PDF viewer / Preview app.
   - Verify layout: Business Name, Contractor Name, Period, 4 Summary Totals, Material Subtotals, Itemized Trips Table, Page numbers, and Signature blocks.
