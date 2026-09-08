/**
 * Shared date formatter used across invoices, quotations and PDFs.
 * Always renders dates as YYYY/MM/DD (Year/Month/Day) as required by the business.
 */
export function formatDateYMD(d, fallback = '—') {
  if (!d) return fallback;
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return fallback;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
  } catch {
    return fallback;
  }
}