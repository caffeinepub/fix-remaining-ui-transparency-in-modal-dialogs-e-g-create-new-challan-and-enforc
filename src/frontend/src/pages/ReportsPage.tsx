import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet } from "lucide-react";
import React, { useState, useMemo } from "react";
import type { PettyCash, PettyCashWithAttachments } from "../backend";
import {
  useChallans,
  useClients,
  usePayments,
  usePettyCash,
} from "../hooks/useQueries";
import { calculateChallanTotal } from "../utils/challanTotals";
import { nanoToDate } from "../utils/dates";
import { exportReportToExcel } from "../utils/exportToExcel";

const ALL_CLIENTS = "__ALL_CLIENTS__";
const ALL_SITES = "__ALL_SITES__";
const ALL_STATUSES = "__ALL_STATUSES__";

type DateFilter = "daily" | "monthly" | "all-time" | "custom";

function formatDate(nanos: bigint): string {
  return nanoToDate(nanos).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getDateRange(
  filter: DateFilter,
  customStart: string,
  customEnd: string,
): { start: Date; end: Date } | null {
  const now = new Date();
  if (filter === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 86400000 - 1);
    return { start, end };
  }
  if (filter === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }
  if (filter === "custom" && customStart && customEnd) {
    return {
      start: new Date(customStart),
      end: new Date(`${customEnd}T23:59:59`),
    };
  }
  return null;
}

function isInDateRange(
  nanos: bigint,
  range: { start: Date; end: Date } | null,
): boolean {
  if (!range) return true;
  const ms = Number(nanos) / 1_000_000;
  return ms >= range.start.getTime() && ms <= range.end.getTime();
}

function calculatePettyCashNetChange(record: PettyCash): number {
  return (
    record.openingBalance +
    record.cashFromMd +
    record.transferFromCashEquivalents +
    record.cashReceivedAuto -
    record.expenses -
    record.staffAdvance -
    record.handoverToMd
  );
}

export default function ReportsPage() {
  const { data: challans = [] } = useChallans();
  const { data: payments = [] } = usePayments();
  const { data: pettyCashWithAttachments = [] } = usePettyCash();
  const { data: clients = [] } = useClients();

  const pettyCashRecords: PettyCash[] = useMemo(
    () =>
      (pettyCashWithAttachments as PettyCashWithAttachments[]).map(
        (p) => p.pettyCash,
      ),
    [pettyCashWithAttachments],
  );

  const [dateFilter, setDateFilter] = useState<DateFilter>("all-time");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const dateRange = useMemo(
    () => getDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd],
  );

  const clientNames: string[] = useMemo(
    () => Array.from(new Set(clients.map((c) => c.name))).sort(),
    [clients],
  );

  const siteNames: string[] = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...challans.map((c) => c.site),
            ...payments.map((p) => p.site),
          ].filter((s): s is string => Boolean(s)),
        ),
      ).sort(),
    [challans, payments],
  );

  const filteredChallans = useMemo(() => {
    return challans.filter((c) => {
      if (!isInDateRange(c.rentDate, dateRange)) return false;
      if (clientFilter !== ALL_CLIENTS && c.clientName !== clientFilter)
        return false;
      if (siteFilter !== ALL_SITES && c.site !== siteFilter) return false;
      if (statusFilter !== ALL_STATUSES) {
        if (statusFilter === "returned" && !c.returned) return false;
        if (statusFilter === "active" && c.returned) return false;
      }
      return true;
    });
  }, [challans, dateRange, clientFilter, siteFilter, statusFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!isInDateRange(p.date, dateRange)) return false;
      if (clientFilter !== ALL_CLIENTS && p.client !== clientFilter)
        return false;
      if (siteFilter !== ALL_SITES && p.site !== siteFilter) return false;
      return true;
    });
  }, [payments, dateRange, clientFilter, siteFilter]);

  const filteredPettyCash = useMemo(() => {
    return pettyCashRecords.filter((r) => isInDateRange(r.date, dateRange));
  }, [pettyCashRecords, dateRange]);

  const totalRent = useMemo(
    () =>
      filteredChallans.reduce((sum, c) => sum + calculateChallanTotal(c), 0),
    [filteredChallans],
  );
  const totalPayments = useMemo(
    () => filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments],
  );
  const cashReceived = useMemo(
    () =>
      filteredPayments
        .filter((p) => p.mode.toLowerCase() === "cash")
        .reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments],
  );
  const onlineReceived = useMemo(
    () =>
      filteredPayments
        .filter((p) => p.mode.toLowerCase() !== "cash")
        .reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments],
  );

  const clientSummary = useMemo(() => {
    const map = new Map<string, { totalRent: number; totalPayments: number }>();
    for (const c of filteredChallans) {
      const total = calculateChallanTotal(c);
      const ex = map.get(c.clientName) || { totalRent: 0, totalPayments: 0 };
      map.set(c.clientName, { ...ex, totalRent: ex.totalRent + total });
    }
    for (const p of filteredPayments) {
      const ex = map.get(p.client) || { totalRent: 0, totalPayments: 0 };
      map.set(p.client, { ...ex, totalPayments: ex.totalPayments + p.amount });
    }
    return Array.from(map.entries()).map(([clientName, data]) => {
      const balance = data.totalRent - data.totalPayments;
      return {
        clientName,
        totalRent: data.totalRent,
        totalPayments: data.totalPayments,
        outstandingBalance: balance > 0 ? balance : 0,
        advance: balance < 0 ? Math.abs(balance) : 0,
      };
    });
  }, [filteredChallans, filteredPayments]);

  const handleDownloadAll = () => {
    exportReportToExcel({
      challans: filteredChallans,
      payments: filteredPayments,
      pettyCash: filteredPettyCash,
      clientBalances: clientSummary,
      summary: {
        totalRent,
        totalReceived: totalPayments,
        cashReceived,
        pendingAmount: totalRent - totalPayments,
        outstanding:
          totalRent - totalPayments > 0 ? totalRent - totalPayments : 0,
        advance:
          totalRent - totalPayments < 0
            ? Math.abs(totalRent - totalPayments)
            : 0,
        pettyCashAdjustments: filteredPettyCash.reduce(
          (s, r) => s + calculatePettyCashNetChange(r),
          0,
        ),
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">
            View and export filtered data across all modules
          </p>
        </div>
        <Button onClick={handleDownloadAll} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Download All
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/20">
        <div className="space-y-1">
          <Label>Date Range</Label>
          <Select
            value={dateFilter}
            onValueChange={(v) => setDateFilter(v as DateFilter)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateFilter === "custom" && (
          <>
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <Label>Client</Label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLIENTS}>All Clients</SelectItem>
              {clientNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Site</Label>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SITES}>All Sites</SelectItem>
              {siteNames.map((site) => (
                <SelectItem key={site} value={site}>
                  {site}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Challan Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Total Rent
          </p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalRent)}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Total Payments
          </p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(totalPayments)}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Cash Received
          </p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(cashReceived)}
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Online Received
          </p>
          <p className="text-xl font-bold mt-1">
            {formatCurrency(onlineReceived)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="challans">
        <TabsList>
          <TabsTrigger value="challans">
            Challans ({filteredChallans.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({filteredPayments.length})
          </TabsTrigger>
          <TabsTrigger value="petty-cash">
            Petty Cash ({filteredPettyCash.length})
          </TabsTrigger>
        </TabsList>

        {/* Challans Tab */}
        <TabsContent value="challans">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challan ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Rent Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChallans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No challans found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredChallans.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">
                        {c.id}
                      </TableCell>
                      <TableCell>{c.clientName}</TableCell>
                      <TableCell>{c.venue || "—"}</TableCell>
                      <TableCell>{formatDate(c.rentDate)}</TableCell>
                      <TableCell>{c.numberOfDays}</TableCell>
                      <TableCell>
                        {formatCurrency(calculateChallanTotal(c))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.returned ? "secondary" : "default"}>
                          {c.returned ? "Returned" : "Active"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No payments found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">
                        {p.id}
                      </TableCell>
                      <TableCell>{p.client}</TableCell>
                      <TableCell>{formatDate(p.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.mode}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.referenceNumber || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Petty Cash Tab */}
        <TabsContent value="petty-cash">
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Cash from MD</TableHead>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Cash Received</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Staff Advance</TableHead>
                  <TableHead>Handover to MD</TableHead>
                  <TableHead>Net Change</TableHead>
                  <TableHead>Closing Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPettyCash.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground py-8"
                    >
                      No petty cash records found for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPettyCash.map((r) => {
                    const netChange = calculatePettyCashNetChange(r);
                    return (
                      <TableRow key={r.date.toString()}>
                        <TableCell>{formatDate(r.date)}</TableCell>
                        <TableCell>
                          {formatCurrency(r.openingBalance)}
                        </TableCell>
                        <TableCell>{formatCurrency(r.cashFromMd)}</TableCell>
                        <TableCell>
                          {formatCurrency(r.transferFromCashEquivalents)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(r.cashReceivedAuto)}
                        </TableCell>
                        <TableCell>{formatCurrency(r.expenses)}</TableCell>
                        <TableCell>{formatCurrency(r.staffAdvance)}</TableCell>
                        <TableCell>{formatCurrency(r.handoverToMd)}</TableCell>
                        <TableCell
                          className={
                            netChange >= 0
                              ? "text-green-600 font-medium"
                              : "text-destructive font-medium"
                          }
                        >
                          {formatCurrency(netChange)}
                        </TableCell>
                        <TableCell
                          className={
                            netChange >= 0
                              ? "text-green-600 font-bold"
                              : "text-destructive font-bold"
                          }
                        >
                          {formatCurrency(netChange)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredPettyCash.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/20 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Expenses: </span>
                <span className="font-semibold">
                  {formatCurrency(
                    filteredPettyCash.reduce((s, r) => s + r.expenses, 0),
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Total Cash from MD:{" "}
                </span>
                <span className="font-semibold">
                  {formatCurrency(
                    filteredPettyCash.reduce((s, r) => s + r.cashFromMd, 0),
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Total Cash Received:{" "}
                </span>
                <span className="font-semibold">
                  {formatCurrency(
                    filteredPettyCash.reduce(
                      (s, r) => s + r.cashReceivedAuto,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
