// Date utility functions for converting between JavaScript Date and backend bigint timestamps

/**
 * Convert JavaScript Date to nanosecond timestamp (bigint)
 */
export function dateToNano(date: Date): bigint {
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

/**
 * Convert nanosecond timestamp (bigint) to JavaScript Date
 */
export function nanoToDate(nano: bigint): Date {
  return new Date(Number(nano / BigInt(1_000_000)));
}

/**
 * Get current timestamp in nanoseconds
 */
export function getTodayNano(): bigint {
  return dateToNano(new Date());
}

/**
 * Normalize date to start of day (00:00:00)
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Parse date string to Date object normalized to start-of-day in local timezone
 * Supports both YYYY-MM-DD and DD-MMM-YY formats (e.g., "2025-08-25" or "25-Aug-25")
 * This prevents timezone-related shifts that can make dates appear incorrect after reload
 * Returns null if invalid
 */
export function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  // Try YYYY-MM-DD format first
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1; // months are 0-indexed
    const day = parseInt(isoMatch[3], 10);
    
    // Create date in local timezone at start of day
    const date = new Date(year, month, day, 0, 0, 0, 0);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  }
  
  // Try DD-MMM-YY format (e.g., "25-Aug-25")
  const ddMmmYyMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (ddMmmYyMatch) {
    const day = parseInt(ddMmmYyMatch[1], 10);
    const monthStr = ddMmmYyMatch[2].toLowerCase();
    const yearShort = parseInt(ddMmmYyMatch[3], 10);
    
    // Map month abbreviations (case-insensitive)
    const monthMap: { [key: string]: number } = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) {
      return null;
    }
    
    // Convert 2-digit year to 4-digit year
    // Assume 00-49 = 2000-2049, 50-99 = 1950-1999
    const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;
    
    // Create date in local timezone at start of day
    const date = new Date(year, month, day, 0, 0, 0, 0);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  }
  
  return null;
}

/**
 * Check if two bigint timestamps represent the same day
 */
export function isSameDay(nano1: bigint, nano2: bigint): boolean {
  const date1 = normalizeDate(nanoToDate(nano1));
  const date2 = normalizeDate(nanoToDate(nano2));
  return date1.getTime() === date2.getTime();
}

/**
 * Calculate rental days between two dates (excluding return day)
 */
export function calculateRentalDays(startDate: Date, endDate: Date): number {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Add days to a Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add days to a nanosecond timestamp (bigint)
 */
export function addDaysToNano(nano: bigint, days: number): bigint {
  const date = nanoToDate(nano);
  const newDate = addDays(date, days);
  return dateToNano(newDate);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 * Returns null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  const date = new Date(dateStr);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

/**
 * Format challan rent date from bigint nanoseconds for consistent display
 * This helper ensures all UI locations display the same rent date value
 */
export function formatChallanRentDate(rentDateNano: bigint): string {
  return formatDate(nanoToDate(rentDateNano));
}
