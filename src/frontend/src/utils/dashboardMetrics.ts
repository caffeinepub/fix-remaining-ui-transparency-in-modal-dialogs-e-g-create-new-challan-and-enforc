import type { Challan, Payment, PettyCash } from "../backend";
import { nanoToDate, startOfDay, startOfMonth } from "./dates";

export interface PeriodMetrics {
  challanCount: number;
  totalRent: number;
  cashReceived: number;
  onlineReceived: number;
  totalReceived: number;
  pendingAmount: number;
  expenses: number;
}

export interface FutureMetrics {
  futureBookingsCount: number;
  futureRevenue: number;
}

export interface DashboardMetrics {
  daily: PeriodMetrics;
  monthly: PeriodMetrics;
  allTime: PeriodMetrics;
  future: FutureMetrics;
}

function calcChallanTotal(challan: Challan): number {
  return (
    challan.items.reduce((s, i) => s + i.quantity * i.rate * i.rentalDays, 0) +
    challan.freight
  );
}

function filterByPeriod(
  challans: Challan[],
  payments: Payment[],
  start: Date | null,
  end: Date | null,
  future: boolean,
): { challans: Challan[]; payments: Payment[] } {
  const now = new Date();
  const todayStart = startOfDay(now);

  const filteredChallans = challans.filter((c) => {
    const rentDate = nanoToDate(c.rentDate);
    if (future) return rentDate > todayStart;
    if (start && rentDate < start) return false;
    if (end && rentDate > end) return false;
    if (!future && rentDate > todayStart) return false;
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    const payDate = nanoToDate(p.date);
    if (future) return false;
    if (start && payDate < start) return false;
    if (end && payDate > end) return false;
    return true;
  });

  return { challans: filteredChallans, payments: filteredPayments };
}

function calcMetrics(challans: Challan[], payments: Payment[]): PeriodMetrics {
  const totalRent = challans.reduce((s, c) => s + calcChallanTotal(c), 0);
  const cashReceived = payments
    .filter((p) => p.mode.toLowerCase() === "cash")
    .reduce((s, p) => s + p.amount, 0);
  const onlineReceived = payments
    .filter((p) => p.mode.toLowerCase() !== "cash")
    .reduce((s, p) => s + p.amount, 0);
  const totalReceived = cashReceived + onlineReceived;
  const pendingAmount = Math.max(0, totalRent - totalReceived);
  const expenses = 0; // expenses come from petty cash

  return {
    challanCount: challans.length,
    totalRent,
    cashReceived,
    onlineReceived,
    totalReceived,
    pendingAmount,
    expenses,
  };
}

export function calculateDashboardMetrics(
  challans: Challan[],
  payments: Payment[],
  _pettyCash: PettyCash[],
): DashboardMetrics {
  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const daily = calcMetrics(
    ...(Object.values(
      filterByPeriod(challans, payments, todayStart, todayEnd, false),
    ) as [Challan[], Payment[]]),
  );
  const monthly = calcMetrics(
    ...(Object.values(
      filterByPeriod(challans, payments, monthStart, null, false),
    ) as [Challan[], Payment[]]),
  );
  const allTime = calcMetrics(
    ...(Object.values(
      filterByPeriod(challans, payments, null, null, false),
    ) as [Challan[], Payment[]]),
  );

  const futureChallans = challans.filter(
    (c) => nanoToDate(c.rentDate) > todayStart,
  );
  const futureRevenue = futureChallans.reduce(
    (s, c) => s + calcChallanTotal(c),
    0,
  );

  return {
    daily,
    monthly,
    allTime,
    future: {
      futureBookingsCount: futureChallans.length,
      futureRevenue,
    },
  };
}
