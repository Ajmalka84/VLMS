import jsPDF from 'jspdf';
import { Load } from '../api/loads';
import { formatSlipNumber, formatSlipDateTime, openWhatsAppTripSlip } from './tripSlipFormatter';

/**
 * Builds a pixel-perfect 80mm x 140mm thermal/voucher jsPDF document for a single load dispatch.
 */
export function buildTripSlipPdfDoc(
  load: Load,
  businessName: string = 'Valiyaparambil Granites & Earthworks',
  contactMobile?: string
): jsPDF {
  // 80mm width, 140mm height (standard 3-inch thermal roll / mini voucher)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 140],
  });

  const slipNo = formatSlipNumber(load);
  const { dateStr, timeStr } = formatSlipDateTime(load);
  const numAmount = Number(load.amount || 0);
  const formattedAmount = numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // 1. Header (Business & Site)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(businessName.toUpperCase(), 40, 10, { align: 'center', maxWidth: 72 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  const siteStr = `${load.site?.siteName || 'Site Dispatch'}${load.site?.location ? ` - ${load.site.location}` : ''}`;
  doc.text(siteStr, 40, 15, { align: 'center', maxWidth: 72 });

  if (contactMobile) {
    doc.setFontSize(7.5);
    doc.text(`Ph: ${contactMobile}`, 40, 19, { align: 'center' });
  }

  // 2. Dispatch Badge & Dotted Line
  const badgeY = contactMobile ? 22 : 19;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(4, badgeY + 1, 76, badgeY + 1);

  doc.setFillColor(15, 23, 42);
  doc.roundedRect(24, badgeY + 3, 32, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GATE DISPATCH PASS', 40, badgeY + 6.8, { align: 'center' });

  // 3. Metadata (Slip No & Date)
  const metaY = badgeY + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Slip No:', 5, metaY);
  doc.text('Date & Time:', 42, metaY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(slipNo, 5, metaY + 4);
  doc.text(`${dateStr} ${timeStr ? timeStr : ''}`, 42, metaY + 4);

  doc.setDrawColor(226, 232, 240);
  doc.line(4, metaY + 6.5, 76, metaY + 6.5);

  // 4. Trip Details Table
  let currentY = metaY + 11;
  const rowGap = 5.2;

  function renderRow(label: string, value: string, isBoldVal = false, isHighlight = false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 5, currentY);

    doc.setFont('helvetica', isBoldVal ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    if (isHighlight) {
      doc.setTextColor(16, 185, 129); // emerald
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(value, 75, currentY, { align: 'right', maxWidth: 45 });
    currentY += rowGap;
  }

  renderRow('Vehicle Number:', load.vehicle?.vehicleNumber || 'N/A', true);
  if (load.vehicle?.vehicleType?.name) {
    renderRow('Vehicle Type:', load.vehicle.vehicleType.name);
  }
  renderRow('Material Loaded:', load.materialType?.name || 'Material', true);
  renderRow('Billed To (C/O):', load.contractor?.name || 'Direct / Walk-in Sale');
  renderRow(
    'Payment Mode:',
    load.paymentType === 'CASH' ? 'CASH [PAID]' : 'CREDIT [ACCOUNT]',
    true,
    load.paymentType === 'CASH'
  );

  // 5. Total Amount Box
  currentY += 1;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.rect(4, currentY, 72, 9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL AMOUNT:', 7, currentY + 6);

  doc.setFontSize(10.5);
  doc.text(`INR ${formattedAmount}`, 73, currentY + 6.2, { align: 'right' });

  currentY += 12;

  // 6. Remarks if present
  if (load.remarks && load.remarks.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Remarks: ${load.remarks.trim()}`, 5, currentY, { maxWidth: 70 });
    currentY += 5;
  }

  // 7. Signature placeholders
  currentY = Math.max(currentY + 3, 118);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(6, currentY, 32, currentY);
  doc.line(48, currentY, 74, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Driver / Site Copy', 19, currentY + 3.5, { align: 'center' });
  doc.text('Authorized Signatory', 61, currentY + 3.5, { align: 'center' });

  // 8. Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via VLMS Gate System', 40, 135, { align: 'center' });

  return doc;
}

/**
 * Downloads the Single Trip Slip as a PDF file.
 */
export function downloadTripSlipPdf(
  load: Load,
  businessName?: string,
  contactMobile?: string
): void {
  const doc = buildTripSlipPdfDoc(load, businessName, contactMobile);
  const cleanVeh = (load.vehicle?.vehicleNumber || 'Load').replace(/[\s-]+/g, '_');
  const filename = `Trip_Slip_${cleanVeh}_${load.date || 'dispatch'}.pdf`;
  doc.save(filename);
}

/**
 * Prints the Single Trip Slip directly via isolated PDF Blob iframe.
 * This guarantees 100% pixel-perfect print without modal backdrop/layout clipping.
 */
export function printTripSlipDirectly(
  load: Load,
  businessName?: string,
  contactMobile?: string
): void {
  const doc = buildTripSlipPdfDoc(load, businessName, contactMobile);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Create hidden iframe to trigger print dialog cleanly
  let iframe = document.getElementById('vlms-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'vlms-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  iframe.src = blobUrl;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(blobUrl, '_blank');
    }
  };
}

/**
 * Shares the Trip Slip as a real PDF file on WhatsApp via Web Share API on mobile devices.
 * If Web Share API with files is not supported (e.g. on desktop), automatically downloads the PDF
 * and opens WhatsApp with the formatted summary text.
 */
export async function shareTripSlipPdfOnWhatsApp(
  load: Load,
  businessName?: string,
  contactMobile?: string,
  recipientMobile?: string
): Promise<{ method: 'share_api' | 'fallback_download' }> {
  const doc = buildTripSlipPdfDoc(load, businessName, contactMobile);
  const cleanVeh = (load.vehicle?.vehicleNumber || 'Load').replace(/[\s-]+/g, '_');
  const filename = `Trip_Slip_${cleanVeh}.pdf`;
  const pdfBlob = doc.output('blob');

  // Check for native Mobile Web Share API file support
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare
  ) {
    try {
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `Trip Slip - ${load.vehicle?.vehicleNumber}`,
          text: `Gate Dispatch Slip for ${load.vehicle?.vehicleNumber} (${load.materialType?.name})`,
          files: [pdfFile],
        });
        return { method: 'share_api' };
      }
    } catch (err: any) {
      // User cancelled share or aborted
      if (err.name === 'AbortError') {
        return { method: 'share_api' };
      }
      console.warn('Web Share API error, falling back:', err);
    }
  }

  // Fallback for desktop / unsupported browsers:
  // 1. Download the PDF file to their device
  doc.save(filename);

  // 2. Open WhatsApp chat with the pre-filled message
  openWhatsAppTripSlip(load, businessName, recipientMobile);

  return { method: 'fallback_download' };
}
