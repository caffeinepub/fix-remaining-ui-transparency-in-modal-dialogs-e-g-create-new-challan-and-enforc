export function dateToNano(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}

export function nanoToDate(nano: bigint): Date {
  return new Date(Number(nano / 1_000_000n));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(str: string): Date | null {
  if (!str) return null;

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(
      Number.parseInt(isoMatch[1]),
      Number.parseInt(isoMatch[2]) - 1,
      Number.parseInt(isoMatch[3]),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD-MMM-YY or DD-MMM-YYYY
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const dmmyMatch = str.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})$/);
  if (dmmyMatch) {
    const day = Number.parseInt(dmmyMatch[1]);
    const mon = months[dmmyMatch[2].toLowerCase()];
    let year = Number.parseInt(dmmyMatch[3]);
    if (year < 100) year += 2000;
    if (mon === undefined) return null;
    const d = new Date(year, mon, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const d = new Date(
      Number.parseInt(dmyMatch[3]),
      Number.parseInt(dmyMatch[2]) - 1,
      Number.parseInt(dmyMatch[1]),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Parse a date string — alias for parseDateOnly for backward compatibility
 */
export function parseDate(str: string): Date | null {
  return parseDateOnly(str);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateRentalDays(startDate: Date, endDate: Date): number {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

export function formatChallanRentDate(rentDateNano: bigint): string {
  return formatDate(nanoToDate(rentDateNano));
}

export function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
