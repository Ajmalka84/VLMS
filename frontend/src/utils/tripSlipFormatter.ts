import { Load } from '../api/loads';

export function formatSlipNumber(load: Load): string {
  if (!load || !load.id) return '#L-0000';
  if (load.id.startsWith('temp-')) {
    return `#L-${load.id.replace('temp-', '').slice(-4)}`;
  }
  const dateStr = load.date ? load.date.split('T')[0].replace(/-/g, '') : '';
  const hashPart = load.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return dateStr ? `#L-${dateStr.slice(2)}-${hashPart}` : `#L-${hashPart}`;
}

export function formatSlipDateTime(load: Load): { dateStr: string; timeStr: string } {
  try {
    const rawDate = load.createdAt || load.date;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      return { dateStr: load.date || '', timeStr: '' };
    }
    const dateStr = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: load.date || '', timeStr: '' };
  }
}

export function generateTripSlipWhatsAppText(
  load: Load,
  businessName?: string,
  contactMobile?: string
): string {
  const slipNo = formatSlipNumber(load);
  const { dateStr, timeStr } = formatSlipDateTime(load);
  const dateTimeDisplay = timeStr ? `${dateStr}, ${timeStr}` : dateStr;
  const numAmount = Number(load.amount || 0);
  const formattedAmount = numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  
  const siteName = load.site?.siteName || 'Site Dispatch';
  const siteLocation = load.site?.location ? ` (${load.site.location})` : '';
  const vehicleNum = load.vehicle?.vehicleNumber || 'N/A';
  const vehicleType = load.vehicle?.vehicleType?.name ? ` (${load.vehicle.vehicleType.name})` : '';
  const materialName = load.materialType?.name || 'Material';
  const contractorName = load.contractor?.name || 'Direct / Spot Sale';
  const paymentMode = load.paymentType === 'CASH' ? '💵 CASH [PAID]' : '📝 CREDIT [A/C]';

  const lines: string[] = [
    `🚚 *TRIP DISPATCH SLIP*`,
    `🏢 *${businessName || 'Quarry & Material Yard'}*`,
    contactMobile ? `📞 ${contactMobile}` : '',
    `📍 *Site:* ${siteName}${siteLocation}`,
    `🔖 *Slip No:* ${slipNo}`,
    `📅 *Date & Time:* ${dateTimeDisplay}`,
    `───────────────────────────`,
    `🚛 *Vehicle:* ${vehicleNum}${vehicleType}`,
    `📦 *Material:* ${materialName}`,
    `👤 *Contractor (C/O):* ${contractorName}`,
    `💳 *Payment Mode:* ${paymentMode}`,
    `💰 *Total Amount:* ₹${formattedAmount}`,
  ];

  if (load.remarks && load.remarks.trim()) {
    lines.push(`📝 *Remarks:* ${load.remarks.trim()}`);
  }

  if (load.id && !load.id.startsWith('temp-') && typeof window !== 'undefined') {
    const origin = window.location.origin;
    lines.push(`🔗 *Digital Slip & PDF:* ${origin}/slip/${load.id}`);
  }

  lines.push(`───────────────────────────`);
  lines.push(`_Generated via VLMS Gate System_`);

  return lines.filter((l) => l !== '').join('\n');
}

export function openWhatsAppTripSlip(
  load: Load,
  businessName?: string,
  contactMobile?: string,
  recipientMobile?: string
): void {
  const text = generateTripSlipWhatsAppText(load, businessName, contactMobile);

  // Auto copy to clipboard for user convenience
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const encodedText = encodeURIComponent(text);
  let cleanMobile = '';

  if (recipientMobile) {
    cleanMobile = recipientMobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = `91${cleanMobile}`;
    }
  }

  const url = cleanMobile
    ? `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    // If popup was blocked by browser, navigate directly
    window.location.href = url;
  }
}
