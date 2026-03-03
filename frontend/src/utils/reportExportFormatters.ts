/**
 * Shared Excel export formatting helpers for Reports module.
 * Provides consistent date conversion, numeric formatting, and text normalization
 * for use by per-module sheet builders.
 */

/**
 * Convert bigint nanoseconds timestamp to Excel-compatible date string (DD/MM/YYYY format)
 */
export function formatDateFromNano(nanoTimestamp: bigint): string {
  const date = new Date(Number(nanoTimestamp) / 1_000_000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format number to 2 decimal places as string
 */
export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

/**
 * Safely normalize text fields, replacing null/undefined with empty string
 */
export function safeText(value: string | null | undefined): string {
  return value?.trim() || '';
}

/**
 * Format date for display in DD-MMM-YY format (e.g., 25-Aug-25)
 */
export function formatDateShort(nanoTimestamp: bigint): string {
  const date = new Date(Number(nanoTimestamp) / 1_000_000);
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}
