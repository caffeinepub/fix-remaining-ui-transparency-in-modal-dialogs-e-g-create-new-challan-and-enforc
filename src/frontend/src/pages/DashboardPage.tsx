import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CalendarClock,
  Clock,
  FileText,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import React from "react";
import type { PettyCash, PettyCashWithAttachments } from "../backend";
import { useChallans, usePayments, usePettyCash } from "../hooks/useQueries";
import {
  type PeriodMetrics,
  calculateDashboardMetrics,
} from "../utils/dashboardMetrics";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {title}
            </p>
            <p className="text-xl font-bold mt-1 truncate">{value}</p>
          </div>
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ml-3 ${color}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PeriodSection({
  title,
  metrics,
  icon: Icon,
}: {
  title: string;
  metrics: PeriodMetrics;
  icon: React.ElementType;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Challans"
          value={String(metrics.challanCount)}
          icon={FileText}
          color="bg-primary/10 text-primary"
        />
        <MetricCard
          title="Total Rent"
          value={fmt(metrics.totalRent)}
          icon={IndianRupee}
          color="bg-green-100 text-green-700"
        />
        <MetricCard
          title="Cash Received"
          value={fmt(metrics.cashReceived)}
          icon={IndianRupee}
          color="bg-amber-100 text-amber-700"
        />
        <MetricCard
          title="Online Received"
          value={fmt(metrics.onlineReceived)}
          icon={TrendingUp}
          color="bg-sky-100 text-sky-700"
        />
        <MetricCard
          title="Total Received"
          value={fmt(metrics.totalReceived)}
          icon={IndianRupee}
          color="bg-green-100 text-green-700"
        />
        <MetricCard
          title="Pending"
          value={fmt(metrics.pendingAmount)}
          icon={Clock}
          color="bg-red-100 text-red-700"
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: challans = [], isLoading: challansLoading } = useChallans();
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: pettyCashWithAttachments = [], isLoading: pcLoading } =
    usePettyCash();

  const isLoading = challansLoading || paymentsLoading || pcLoading;

  const pettyCash = React.useMemo(
    () =>
      (pettyCashWithAttachments as PettyCashWithAttachments[]).map(
        (p) => p.pettyCash,
      ),
    [pettyCashWithAttachments],
  );

  const metrics = React.useMemo(
    () => calculateDashboardMetrics(challans, payments, pettyCash),
    [challans, payments, pettyCash],
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton list
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {challans.length} Total Challans
        </Badge>
      </div>

      {/* Future Bookings */}
      {metrics.future.futureBookingsCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <CalendarClock className="w-4 h-4" />
              Future Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Upcoming Challans
                </p>
                <p className="text-2xl font-bold">
                  {metrics.future.futureBookingsCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Future Revenue</p>
                <p className="text-2xl font-bold">
                  {fmt(metrics.future.futureRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PeriodSection title="Today" metrics={metrics.daily} icon={Calendar} />
      <PeriodSection
        title="This Month"
        metrics={metrics.monthly}
        icon={Calendar}
      />
      <PeriodSection
        title="All Time"
        metrics={metrics.allTime}
        icon={FileText}
      />
    </div>
  );
}
