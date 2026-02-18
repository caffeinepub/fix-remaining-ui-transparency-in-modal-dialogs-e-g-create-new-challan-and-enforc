// Dashboard metrics calculation utilities

import type { Challan, Payment, PettyCash } from '../backend';
import { calculateChallanTotal } from './challanTotals';
import { nanoToDate, normalizeDate } from './dates';

export interface DashboardMetrics {
  totalRevenue: number;
  totalChallanCount: number;
  cashReceived: number;
  onlineReceived: number;
  totalReceived: number;
  pendingAmount: number;
  returnedChallans: number;
  cashInHand: number;
  totalExpensesExpensesPlusStaff: number;
}

export interface FutureMetrics {
  futureChallans: number;
  futureRevenue: number;
}

/**
 * Get start and end of today in nanoseconds
 */
function getTodayRange(): { start: bigint; end: bigint } {
  const now = new Date();
  const start = normalizeDate(now);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: BigInt(start.getTime()) * BigInt(1_000_000),
    end: BigInt(end.getTime()) * BigInt(1_000_000),
  };
}

/**
 * Get start and end of current month in nanoseconds
 */
function getMonthRange(): { start: bigint; end: bigint } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  
  return {
    start: BigInt(start.getTime()) * BigInt(1_000_000),
    end: BigInt(end.getTime()) * BigInt(1_000_000),
  };
}

/**
 * Check if a timestamp (rent date) is in the future (greater than today)
 */
function isFutureDate(timestamp: bigint): boolean {
  const today = normalizeDate(new Date());
  const date = normalizeDate(nanoToDate(timestamp));
  return date.getTime() > today.getTime();
}

/**
 * Check if a timestamp (rent date) is today or earlier
 */
function isRentDateActiveOrPast(timestamp: bigint): boolean {
  const today = normalizeDate(new Date());
  const date = normalizeDate(nanoToDate(timestamp));
  return date.getTime() <= today.getTime();
}

/**
 * Calculate future metrics (always from all challans, not period-filtered)
 */
export function calculateFutureMetrics(challans: Challan[]): FutureMetrics {
  const futureChallans = challans.filter(c => isFutureDate(c.rentDate));
  
  const futureRevenue = futureChallans.reduce((sum, challan) => {
    return sum + calculateChallanTotal(challan);
  }, 0);

  return {
    futureChallans: futureChallans.length,
    futureRevenue,
  };
}

/**
 * Calculate metrics for a given time period
 * Implements revenue-day logic:
 * - Total Revenue: only challans where rentDate <= today
 * - Cash Received: sum of payments where mode is "Cash" (case-insensitive)
 * - Online Received: sum of payments where mode is "Online" (case-insensitive)
 * - Total Received: Cash Received + Online Received
 * - Payments are filtered by createdAt timestamp (when payment was recorded)
 * - Cash in Hand: latest closingBalance from petty cash in period
 * - Total Expenses (Expenses + Staff): sum of (expenses + staffAdvance) in period
 */
export function calculateMetrics(
  challans: Challan[],
  payments: Payment[],
  pettyCash: PettyCash[],
  startDate?: bigint,
  endDate?: bigint
): DashboardMetrics {
  let periodChallans = challans;
  let periodPayments = payments;
  let periodPettyCash = pettyCash;

  // Apply period filter if dates provided
  if (startDate && endDate) {
    // Filter challans by rentDate
    periodChallans = challans.filter(c => c.rentDate >= startDate && c.rentDate <= endDate);
    // Filter payments by createdAt (when payment was recorded)
    periodPayments = payments.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
    // Filter petty cash by date
    periodPettyCash = pettyCash.filter(pc => pc.date >= startDate && pc.date <= endDate);
  }

  // Only include challans where rentDate <= today (exclude future)
  const activeChallans = periodChallans.filter(c => isRentDateActiveOrPast(c.rentDate));

  // Total Revenue: sum of challan amounts where rentDate <= today
  const totalRevenue = activeChallans.reduce((sum, challan) => {
    return sum + calculateChallanTotal(challan);
  }, 0);

  // Total Challan Count (active only, excluding future)
  const totalChallanCount = activeChallans.length;

  // Cash Received: sum of payments where mode is "Cash" (case-insensitive)
  const cashReceived = periodPayments
    .filter(payment => payment.mode.toLowerCase() === 'cash')
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Online Received: sum of payments where mode is "Online" (case-insensitive)
  const onlineReceived = periodPayments
    .filter(payment => payment.mode.toLowerCase() === 'online')
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Total Received: Cash Received + Online Received
  const totalReceived = cashReceived + onlineReceived;

  // Pending Amount: Total Revenue - Total Received
  const pendingAmount = totalRevenue - totalReceived;

  // Returned Challans: count of challans marked as returned (from active only)
  const returnedChallans = activeChallans.filter(c => c.returned).length;

  // Cash in Hand: latest closingBalance from petty cash in period
  let cashInHand = 0;
  if (periodPettyCash.length > 0) {
    // Sort by date descending and take the latest
    const sortedPettyCash = [...periodPettyCash].sort((a, b) => Number(b.date) - Number(a.date));
    cashInHand = sortedPettyCash[0].closingBalance;
  }

  // Total Expenses (Expenses + Staff): sum of (expenses + staffAdvance) in period
  const totalExpensesExpensesPlusStaff = periodPettyCash.reduce((sum, record) => {
    return sum + record.expenses + record.staffAdvance;
  }, 0);

  return {
    totalRevenue,
    totalChallanCount,
    cashReceived,
    onlineReceived,
    totalReceived,
    pendingAmount,
    returnedChallans,
    cashInHand,
    totalExpensesExpensesPlusStaff,
  };
}

/**
 * Calculate daily metrics
 * Only includes challans where rentDate = today AND rentDate <= today
 * Payments filtered by createdAt = today
 */
export function calculateDailyMetrics(
  challans: Challan[],
  payments: Payment[],
  pettyCash: PettyCash[]
): DashboardMetrics {
  const { start, end } = getTodayRange();
  return calculateMetrics(challans, payments, pettyCash, start, end);
}

/**
 * Calculate monthly metrics
 * Only includes challans where rentDate is in current month AND rentDate <= today
 * Payments filtered by createdAt in current month
 */
export function calculateMonthlyMetrics(
  challans: Challan[],
  payments: Payment[],
  pettyCash: PettyCash[]
): DashboardMetrics {
  const { start, end } = getMonthRange();
  return calculateMetrics(challans, payments, pettyCash, start, end);
}

/**
 * Calculate all-time metrics
 * Includes all challans where rentDate <= today for Total Revenue
 * All payments included
 */
export function calculateAllTimeMetrics(
  challans: Challan[],
  payments: Payment[],
  pettyCash: PettyCash[]
): DashboardMetrics {
  return calculateMetrics(challans, payments, pettyCash);
}
