import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SettlementReportResponse } from '../api/reports';
import { numberToWordsINR } from './numberToWords';
import { groupTrips } from './tripGrouper';

/**
 * Formats a Date object or ISO string into a crisp "DD MMM YYYY" format (e.g., "19 Aug 2026")
 */
function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Standardizes Indian vehicle registration numbers (e.g., "KL41R7350" -> "KL 41 R 7350")
 */
function formatVehicleNo(vNo: string): string {
  if (!vNo) return '-';
  const cleaned = vNo.replace(/[\s-]+/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
  }
  return vNo.toUpperCase();
}

export interface PdfCustomHeaderOptions {
  customBusinessName?: string;
  customContact?: string;
  customGstin?: string;
}

export function exportSettlementPdf(
  data: SettlementReportResponse,
  fallbackBusinessName: string = 'VLMS Quarry Management',
  customOptions?: PdfCustomHeaderOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isDirectSale =
    !data.contractor.id ||
    data.contractor.name.toLowerCase().includes('direct') ||
    data.contractor.name.toLowerCase().includes('walk-in') ||
    data.contractor.name.toLowerCase().includes('spot cash');

  const businessName = (
    customOptions?.customBusinessName?.trim() ||
    data.business?.businessName ||
    fallbackBusinessName ||
    'VLMS OPERATIONAL QUARRY'
  ).toUpperCase();

  const businessContact =
    customOptions?.customContact?.trim() ||
    (data.business?.mobile ? `+91 ${data.business.mobile}` : 'N/A');

  const rawGstin =
    customOptions?.customGstin !== undefined
      ? customOptions.customGstin.trim()
      : data.business?.gstin || '';
  const businessGstin = rawGstin ? (rawGstin.toUpperCase().startsWith('GSTIN:') ? rawGstin.toUpperCase() : `GSTIN: ${rawGstin.toUpperCase()}`) : null;

  const contractorName = (
    isDirectSale ? 'DIRECT / SPOT CASH SALES (WALK-IN)' : data.contractor.name
  ).toUpperCase();
  const contractorContact =
    data.contractor.mobile && data.contractor.mobile !== 'N/A'
      ? `+91 ${data.contractor.mobile}`
      : isDirectSale
      ? 'On-Site Counter Retail'
      : 'N/A';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 12;

  // Generate Clean Statement Reference Number
  const prefix = isDirectSale
    ? 'CASH'
    : data.contractor.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CASH';
  const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
  const stmtRef = `STMT-${new Date().getFullYear()}${monthStr}-${prefix}-${String(data.summary.totalTrips).padStart(3, '0')}`;

  // Billing Period Range
  const periodText =
    data.period.startDate && data.period.endDate
      ? `${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}`
      : 'All Time Recorded Dispatches';

  // -------------------------------------------------------------------------
  // 1. Corporate Letterhead & Document Header
  // -------------------------------------------------------------------------
  // Company Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(businessName, 14, currentY, { maxWidth: pageWidth - 14 - 70 });

  // Document Badge on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('SETTLEMENT STATEMENT / BILL', pageWidth - 14, currentY, { align: 'right' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Contact: ${businessContact}${businessGstin ? `  •  ${businessGstin}` : ''}`,
    14,
    currentY,
    { maxWidth: pageWidth - 14 - 65 }
  );
  doc.text(`Statement Ref: ${stmtRef}`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 4;
  doc.text(`Issue Date: ${formatDate(new Date())}`, pageWidth - 14, currentY, { align: 'right' });

  // Top Header Divider Line
  currentY += 3;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.35);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 4;

  // -------------------------------------------------------------------------
  // 2. Party Details & Statement Metadata (Two-Card Structure with No Wrapping)
  // -------------------------------------------------------------------------
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.4, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, textColor: [100, 116, 139] },
      1: { cellWidth: 63, fontStyle: 'bold' },
      2: { fontStyle: 'bold', cellWidth: 30, halign: 'right', textColor: [100, 116, 139] },
      3: { cellWidth: 61, halign: 'right' },
    },
    body: [
      [
        'BILLED TO:',
        contractorName,
        'STATEMENT REF:',
        stmtRef,
      ],
      [
        'CONTACT NO:',
        contractorContact,
        'BILLING PERIOD:',
        periodText,
      ],
      [
        'ACCOUNT TYPE:',
        isDirectSale ? 'Spot Cash / Counter Sales' : 'Transport C/O Contractor Ledger',
        'TOTAL DISPATCHES:',
        String(data.summary.totalTrips),
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  const totalBilled = Math.round(data.summary.totalAmount);
  const cashPaid = Math.round(data.summary.cashAmount);
  const netDue = Math.round(data.summary.creditAmount);
  const amountWords = numberToWordsINR(netDue);

  // -------------------------------------------------------------------------
  // 3. Material Volume Breakdown (if multiple materials)
  // -------------------------------------------------------------------------
  if (data.materialBreakdown.length > 0) {
    autoTable(doc, {
      startY: currentY,
      theme: 'striped',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      head: [['Material Specification', 'Dispatch Share & Trip Count', 'Subtotal Volume (INR)']],
      body: data.materialBreakdown.map((m) => [
        m.materialName,
        `${m.tripCount} (${m.percentage}%)`,
        `Rs. ${Math.round(m.totalAmount).toLocaleString('en-IN')}`,
      ]),
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // -------------------------------------------------------------------------
  // 4. Grouped Commercial Dispatch Ledger Table
  // -------------------------------------------------------------------------
  const groupedTrips = groupTrips(data.trips);
  const tripRows = groupedTrips.map((g, idx) => [
    String(idx + 1),
    formatDate(g.date),
    formatVehicleNo(g.vehicleNumber),
    g.materialName,
    g.siteName,
    String(g.tripCount),
    `Rs. ${g.rate.toLocaleString('en-IN')}`,
    `Rs. ${g.totalAmount.toLocaleString('en-IN')}`,
    g.paymentType,
  ]);

  autoTable(doc, {
    startY: currentY,
    showFoot: 'lastPage', // Only prints totals on the last page of the ledger
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 1.6,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { cellWidth: 20 },
      2: { fontStyle: 'bold', cellWidth: 25 },
      3: { cellWidth: 24 },
      4: { cellWidth: 40 }, // WIDE: Prevents site names from breaking onto 2 lines
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'right',
      cellPadding: 2.2,
    },
    didParseCell: (data) => {
      // Highlight CASH vs CREDIT in table rows (column index 8)
      if (data.section === 'body' && data.column.index === 8) {
        if (data.cell.raw === 'CASH') {
          data.cell.styles.textColor = [22, 101, 52]; // green
        } else if (data.cell.raw === 'CREDIT') {
          data.cell.styles.textColor = [180, 83, 9]; // amber
        }
      }
    },
    head: [['#', 'Date', 'Vehicle Number', 'Material', 'Quarry Site', 'Trips', 'Trip Rate', 'Total Amount', 'Payment']],
    body: tripRows,
    foot: [
      [
        '',
        '',
        '',
        '',
        'GROSS TOTALS:',
        String(data.summary.totalTrips),
        '',
        `Rs. ${totalBilled.toLocaleString('en-IN')}`,
        '',
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // -------------------------------------------------------------------------
  // 5. Executive Financial Settlement Summary Matrix (Positioned Below Table)
  // -------------------------------------------------------------------------
  if (currentY + 32 > pageHeight - 15) {
    doc.addPage();
    currentY = 16;
  }

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [15, 23, 42],
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 47 },
      2: { cellWidth: 47, textColor: [22, 101, 52] }, // emerald-700
      3: { cellWidth: 53, textColor: [180, 83, 9] },  // amber-700
    },
    head: [['TOTAL DISPATCHES', 'GROSS BILLED (INR)', 'CASH SETTLED (INR)', 'NET CREDIT BALANCE (INR)']],
    body: [
      [
        String(data.summary.totalTrips),
        `Rs. ${totalBilled.toLocaleString('en-IN')}`,
        `Rs. ${cashPaid.toLocaleString('en-IN')}`,
        `Rs. ${netDue.toLocaleString('en-IN')}`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 2.5;

  // -------------------------------------------------------------------------
  // 6. Net Balance in Words (Framed Banner Strip)
  // -------------------------------------------------------------------------
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: {
      fillColor: [248, 250, 252], // slate-50
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineWidth: 0.2,
      lineColor: [226, 232, 240], // slate-200
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36, textColor: [100, 116, 139] },
      1: { fontStyle: 'bold', textColor: [180, 83, 9] },
    },
    body: [['Net Balance in Words:', amountWords]],
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // -------------------------------------------------------------------------
  // 7. Terms & Commercial Notes
  // -------------------------------------------------------------------------
  if (currentY + 38 > pageHeight - 15) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Terms & Confirmation:', 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    '1. This statement reflects verified dispatch logs from automated weighbridge and site register entries.\n2. Any settlement discrepancies must be notified to quarry dispatch within 7 business days.\n3. Cash payments settled on-site are marked CASH; pending transport dues are recorded under Credit Balance.',
    14,
    currentY + 3.5
  );

  currentY += 16;

  // -------------------------------------------------------------------------
  // 8. Seal Placeholder & Dual Signature Blocks
  // -------------------------------------------------------------------------
  if (currentY + 28 > pageHeight - 15) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  // Left Signatory (Quarry Management)
  doc.line(14, currentY + 10, 68, currentY + 10);
  doc.text('Authorized Signatory', 14, currentY + 14);
  doc.setFontSize(6.5);
  doc.text(businessName, 14, currentY + 17.5, { maxWidth: 54 });
  doc.setTextColor(148, 163, 184);
  doc.text('Date: ________________', 14, currentY + 21);

  // Center Seal Stamp Box
  doc.setDrawColor(226, 232, 240);
  doc.rect(pageWidth / 2 - 16, currentY + 2, 32, 20);
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('[ OFFICIAL SEAL ]', pageWidth / 2, currentY + 12, { align: 'center' });

  // Right Signatory (Transporter / Customer)
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.line(pageWidth - 68, currentY + 10, pageWidth - 14, currentY + 10);
  doc.text(
    isDirectSale ? 'Customer / Counter Receiver' : 'Transporter / Receiver Signature',
    pageWidth - 68,
    currentY + 14
  );
  doc.setFontSize(6.5);
  doc.text(contractorName, pageWidth - 68, currentY + 17.5, { maxWidth: 54 });
  doc.setTextColor(148, 163, 184);
  doc.text('Date: ________________', pageWidth - 68, currentY + 21);

  // -------------------------------------------------------------------------
  // 9. Page Numbers
  // -------------------------------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Page ${i} of ${totalPages}  •  VLMS Logistics Management Platform`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // -------------------------------------------------------------------------
  // 10. Save Output File
  // -------------------------------------------------------------------------
  const sanitizedName = data.contractor.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateSuffix = new Date().toISOString().split('T')[0];
  const fileName = `Settlement_Bill_${sanitizedName}_${dateSuffix}.pdf`;

  doc.save(fileName);
}

// -------------------------------------------------------------------------
// CASHFLOW STATEMENT PDF
// -------------------------------------------------------------------------
export function exportCashflowPdf(
  data: any,
  fallbackBusinessName: string = 'VLMS Quarry Management',
  customOptions?: PdfCustomHeaderOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = (
    customOptions?.customBusinessName?.trim() ||
    data.business?.businessName ||
    fallbackBusinessName ||
    'VLMS OPERATIONAL QUARRY'
  ).toUpperCase();

  const businessContact =
    customOptions?.customContact?.trim() ||
    (data.business?.mobile ? `+91 ${data.business.mobile}` : 'N/A');

  const rawGstin =
    customOptions?.customGstin !== undefined
      ? customOptions.customGstin.trim()
      : data.business?.gstin || '';
  const businessGstin = rawGstin ? (rawGstin.toUpperCase().startsWith('GSTIN:') ? rawGstin.toUpperCase() : `GSTIN: ${rawGstin.toUpperCase()}`) : null;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  const headerMeta = [
    `Contact: ${businessContact}`,
    businessGstin ? businessGstin : '',
    `Generated: ${formatDate(new Date())}`,
  ].filter(Boolean).join('  •  ');
  doc.text(headerMeta, 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('SITE CASHFLOW STATEMENT', pageWidth - 14, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const periodText = data.period?.startDate && data.period?.endDate
    ? `${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}`
    : 'All Time Recorded Transactions';
  doc.text(periodText, pageWidth - 14, 18, { align: 'right' });

  currentY = 36;

  // KPI Summary Cards
  const kpis = [
    { label: 'TOTAL INFLOWS (CASH)', value: `INR ${Number(data.summary?.totalInflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [16, 185, 129] },
    { label: 'TOTAL OUTFLOWS (EXPENSES)', value: `INR ${Number(data.summary?.totalOutflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [239, 68, 68] },
    { label: 'NET CASH DRAWER FLOW', value: `INR ${Number(data.summary?.netCashflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [245, 158, 11] },
    { label: 'MACHINE ADVANCES', value: `INR ${Number(data.summary?.machineryAdvancesTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [148, 163, 184] },
  ];

  const cardW = (pageWidth - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, currentY, cardW, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x + cardW / 2, currentY + 4.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, x + cardW / 2, currentY + 10, { align: 'center' });
  });

  currentY += 19;

  // Daily Timeline Table
  const tableRows = (data.timeline || []).map((t: any) => [
    formatDate(t.date),
    String(t.loadsCount || 0),
    `INR ${Number(t.inflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    String(t.expensesCount || 0),
    `INR ${Number(t.outflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `INR ${Number(t.netCashflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Cash Loads', 'Total Inflows', 'Cash Expenses', 'Total Outflows', 'Net Daily Flow']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatory
  if (currentY + 25 > pageHeight - 15) {
    doc.addPage();
    currentY = 18;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.line(14, currentY + 10, 70, currentY + 10);
  doc.text('Authorized Quarry Accounts Manager', 14, currentY + 14);
  doc.setFontSize(6.5);
  doc.text(businessName, 14, currentY + 17.5);

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}  •  VLMS Cashflow Intelligence`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  doc.save(`Cashflow_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
}

// -------------------------------------------------------------------------
// CO-PARTNER SETTLEMENT PDF
// -------------------------------------------------------------------------
export function exportPartnerSettlementPdf(
  data: any,
  fallbackBusinessName: string = 'VLMS Quarry Management',
  customOptions?: PdfCustomHeaderOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = (
    customOptions?.customBusinessName?.trim() ||
    data.business?.businessName ||
    fallbackBusinessName ||
    'VLMS OPERATIONAL QUARRY'
  ).toUpperCase();

  const partnerName = (data.selectedPartner?.name || 'CO-PARTNER').toUpperCase();
  const partnerMobile = data.selectedPartner?.mobile ? `+91 ${data.selectedPartner.mobile}` : 'N/A';

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Partner: ${partnerName}  •  Mobile: ${partnerMobile}`, 14, 17);
  doc.text(`Statement Generated: ${formatDate(new Date())}`, 14, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11);
  doc.text('CO-PARTNER PROFIT SETTLEMENT', pageWidth - 14, 11, { align: 'right' });

  const periodText = data.period?.startDate && data.period?.endDate
    ? `${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}`
    : 'All Time Recorded Slices';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(periodText, pageWidth - 14, 17, { align: 'right' });

  currentY = 38;

  // Summary Cards
  const kpis = [
    { label: 'TOTAL REVENUE', value: `INR ${Number(data.summary?.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [16, 185, 129] },
    { label: 'OPERATING EXPENSES', value: `INR ${Number(data.summary?.totalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [239, 68, 68] },
    { label: 'NET OPERATING MARGIN', value: `INR ${Number(data.summary?.totalNetMargin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [59, 130, 246] },
    { label: 'NET DIVIDEND PAYABLE', value: `INR ${Number(data.summary?.netDividendPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [245, 158, 11] },
  ];

  const cardW = (pageWidth - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, currentY, cardW, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x + cardW / 2, currentY + 4.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, x + cardW / 2, currentY + 10, { align: 'center' });
  });

  currentY += 19;

  // Slices Table
  const sliceRows = (data.slices || []).map((s: any) => [
    s.siteName,
    `${Number(s.sharePercentage)}%`,
    `${formatDate(s.windowStart)} - ${formatDate(s.windowEnd)}`,
    `INR ${Number(s.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `INR ${Number(s.expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `INR ${Number(s.netMargin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `INR ${Number(s.grossDividend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Quarry Site', 'Equity %', 'Temporal Window', 'Revenue', 'Expenses', 'Net Margin', 'Partner Dividend']],
    body: sliceRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { halign: 'center', cellWidth: 18 },
      2: { cellWidth: 38 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Amount in Words Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, currentY, pageWidth - 28, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const words = numberToWordsINR(Number(data.summary?.netDividendPayable || 0));
  doc.text(`Net Dividend in Words: ${words}`, 18, currentY + 6.5);

  currentY += 18;

  // Dual Signatures
  if (currentY + 25 > pageHeight - 15) {
    doc.addPage();
    currentY = 18;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.line(14, currentY + 10, 68, currentY + 10);
  doc.text('Managing Partner / Owner Signature', 14, currentY + 14);

  doc.line(pageWidth - 68, currentY + 10, pageWidth - 14, currentY + 10);
  doc.text('Co-Partner Acceptance Signature', pageWidth - 68, currentY + 14);

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}  •  VLMS Co-Partner Profit Slicing Engine`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  doc.save(`Partner_Settlement_${partnerName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// -------------------------------------------------------------------------
// MACHINERY SETTLEMENT PDF
// -------------------------------------------------------------------------
export function exportMachinerySettlementPdf(
  data: any,
  fallbackBusinessName: string = 'VLMS Quarry Management',
  customOptions?: PdfCustomHeaderOptions
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = (
    customOptions?.customBusinessName?.trim() ||
    data.business?.businessName ||
    fallbackBusinessName ||
    'VLMS OPERATIONAL QUARRY'
  ).toUpperCase();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(businessName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Statement Generated: ${formatDate(new Date())}`, 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11);
  doc.text('HEAVY MACHINERY RENTAL SETTLEMENT', pageWidth - 14, 12, { align: 'right' });

  const periodText = data.period?.startDate && data.period?.endDate
    ? `${formatDate(data.period.startDate)} to ${formatDate(data.period.endDate)}`
    : 'All Recorded Machinery Logbook Entries';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(periodText, pageWidth - 14, 18, { align: 'right' });

  currentY = 36;

  // Summary Cards
  const kpis = [
    { label: 'TOTAL WORKING HOURS', value: `${Number(data.grandTotal?.totalHours || 0).toFixed(2)} hrs`, color: [59, 130, 246] },
    { label: 'GROSS RENTAL BILLABLE', value: `INR ${Number(data.grandTotal?.totalGrossRent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [15, 23, 42] },
    { label: 'OPERATOR ADVANCES PAID', value: `INR ${Number(data.grandTotal?.totalAdvancesPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [239, 68, 68] },
    { label: 'BALANCE PAYABLE TO VENDOR', value: `INR ${Number(data.grandTotal?.balancePayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: [16, 185, 129] },
  ];

  const cardW = (pageWidth - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(x, currentY, cardW, 14, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, x + cardW / 2, currentY + 4.5, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.value, x + cardW / 2, currentY + 10, { align: 'center' });
  });

  currentY += 19;

  // Detailed Logbook Table
  const logRows = (data.logs || []).map((l: any) => [
    formatDate(l.date),
    `${l.machineryName} (${l.machineryCode || 'N/A'})`,
    l.vendorName || '-',
    `${l.startTime || '00:00'} - ${l.closingTime || '00:00'}`,
    `${Number(l.totalHours).toFixed(2)} hrs`,
    `INR ${Number(l.rentPerHour).toLocaleString('en-IN')}`,
    `INR ${Number(l.grossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    `INR ${Number(l.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Machinery', 'Vendor', 'Working Shift', 'Hours', 'Rate/hr', 'Gross Rent', 'Advance Paid']],
    body: logRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    bodyStyles: { fontSize: 6.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 32 },
      2: { cellWidth: 24 },
      3: { cellWidth: 28 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 20 },
    },
    styles: { overflow: 'linebreak', cellPadding: 1.8 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Signatures
  if (currentY + 25 > pageHeight - 15) {
    doc.addPage();
    currentY = 18;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  doc.line(14, currentY + 10, 68, currentY + 10);
  doc.text('Quarry Operational Manager', 14, currentY + 14);

  doc.line(pageWidth - 68, currentY + 10, pageWidth - 14, currentY + 10);
  doc.text('Machine Owner / Vendor Signature', pageWidth - 68, currentY + 14);

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}  •  VLMS Machinery Rental Engine`, pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  doc.save(`Machinery_Settlement_${new Date().toISOString().split('T')[0]}.pdf`);
}

