/**
 * Centralized formatting helpers for Indian currency, dates, numbers, and fleet time
 */

/**
 * Format a number or string into Indian Rupee notation (e.g. ₹1,45,000)
 */
export function formatINR(
  amount: number | string | undefined | null,
  options: { decimals?: number; showSymbol?: boolean } = {}
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return options.showSymbol !== false ? '₹0' : '0';

  const decimals = options.decimals !== undefined ? options.decimals : 0;
  const showSymbol = options.showSymbol !== false;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Format a standard ISO date string to a human-readable Indian date (e.g. 08 Sep 2026)
 */
export function formatShortDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format a date to 12-hour Indian standard time (e.g. 08:30 AM)
 */
export function formatTime(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

/**
 * Format hours to clean 1-decimal string (e.g. 8.5 hrs)
 */
export function formatHours(hours: number | string | undefined | null): string {
  const num = typeof hours === 'number' ? hours : parseFloat(String(hours || 0));
  if (isNaN(num) || num === 0) return '0 hrs';
  return `${Math.round(num * 10) / 10} hrs`;
}
