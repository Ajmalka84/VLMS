/**
 * Robust CSV Exporter utility
 * Formats multi-column data with RFC-4180 escaping and UTF-8 BOM for Microsoft Excel / Numbers compatibility.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const lines: string[] = [];
  if (headers && headers.length > 0) {
    lines.push(headers.map(escapeCell).join(','));
  }
  rows.forEach((r) => {
    lines.push(r.map(escapeCell).join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
