import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SettlementReportResponse } from '../api/reports';

export function exportSettlementPdf(
  data: SettlementReportResponse,
  fallbackBusinessName: string = 'VLMS Quarry Management'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const businessName = (
    data.business?.businessName ||
    fallbackBusinessName ||
    'VLMS OPERATIONAL QUARRY'
  ).toUpperCase();
  const businessContact = data.business?.mobile ? `+91 ${data.business.mobile}` : 'N/A';
  const businessGstin = data.business?.gstin ? ` • GSTIN: ${data.business.gstin}` : '';

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // 1. Header Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(businessName, 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Contact: ${businessContact}${businessGstin}`, 14, currentY + 5);

  // Document Title Badge on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text('SETTLEMENT STATEMENT', pageWidth - 14, currentY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Date: ${new Date().toLocaleDateString('en-IN')}`,
    pageWidth - 14,
    currentY + 5,
    { align: 'right' }
  );

  // Header Divider
  currentY += 9;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 5;

  // 2. Billed To & Period Meta Box
  const periodText =
    data.period.startDate && data.period.endDate
      ? `${new Date(data.period.startDate).toLocaleDateString('en-IN')} to ${new Date(
          data.period.endDate
        ).toLocaleDateString('en-IN')}`
      : 'All Time Records';

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      1: { cellWidth: 68 },
      2: { fontStyle: 'bold', cellWidth: 26, halign: 'right' },
      3: { halign: 'right' },
    },
    body: [
      [
        'Billed To:',
        `${data.contractor.name} (+91 ${data.contractor.mobile})`,
        'Period:',
        periodText,
      ],
      [
        'Account Type:',
        'Transport C/O Contractor',
        'Total Dispatches:',
        `${data.summary.totalTrips} Loads Recorded`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 3. Financial Summary Table (KPI Box)
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 9.5,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [15, 23, 42],
    },
    head: [['TOTAL LOADS', 'GROSS BILLED (INR)', 'CASH SETTLED (INR)', 'NET CREDIT DUE (INR)']],
    body: [
      [
        String(data.summary.totalTrips),
        `Rs. ${data.summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Rs. ${data.summary.cashAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Rs. ${data.summary.creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 4. Material Summary Table (if multiple materials)
  if (data.materialBreakdown.length > 0) {
    autoTable(doc, {
      startY: currentY,
      theme: 'striped',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' },
      },
      head: [['Material Loaded', 'Dispatches Count & Share', 'Volume Amount (INR)']],
      body: data.materialBreakdown.map((m) => [
        m.materialName,
        `${m.tripCount} Trips (${m.percentage}%)`,
        `Rs. ${m.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      ]),
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // 5. Itemized Dispatch Trips Table
  const tripRows = data.trips.map((t, idx) => [
    String(idx + 1),
    new Date(t.date).toLocaleDateString('en-IN'),
    t.vehicleNumber,
    t.materialName,
    t.siteName,
    t.paymentType,
    `Rs. ${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.2,
      lineColor: [203, 213, 225],
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 32 },
      4: { cellWidth: 36 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      6: { halign: 'right', fontStyle: 'bold' },
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'right',
    },
    head: [['#', 'Date', 'Vehicle No', 'Material', 'Quarry Site', 'Payment', 'Amount']],
    body: tripRows,
    foot: [
      [
        '',
        '',
        '',
        '',
        '',
        'NET CREDIT DUE:',
        `Rs. ${data.summary.creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 12;

  // Check if signature block fits on the page, else add page
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + 25 > pageHeight - 15) {
    doc.addPage();
    currentY = 20;
  }

  // 6. Official Signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  // Left Signature (Quarry Signatory)
  doc.line(14, currentY + 12, 65, currentY + 12);
  doc.text('Authorized Signatory', 14, currentY + 16);
  doc.setFontSize(7);
  doc.text(businessName, 14, currentY + 20);

  // Right Signature (Contractor Signature)
  doc.setFontSize(8);
  doc.line(pageWidth - 65, currentY + 12, pageWidth - 14, currentY + 12);
  doc.text('Contractor Signature', pageWidth - 65, currentY + 16);
  doc.setFontSize(7);
  doc.text(data.contractor.name, pageWidth - 65, currentY + 20);

  // 7. Add Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Page ${i} of ${totalPages} • Generated via VLMS Logistics Platform`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // 8. Download PDF File
  const sanitizedName = data.contractor.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateSuffix = new Date().toISOString().split('T')[0];
  const fileName = `Settlement_${sanitizedName}_${dateSuffix}.pdf`;

  doc.save(fileName);
}
