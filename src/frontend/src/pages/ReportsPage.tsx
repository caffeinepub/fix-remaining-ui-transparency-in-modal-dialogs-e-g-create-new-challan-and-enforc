import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Filter, AlertCircle } from 'lucide-react';
import {
  useChallans,
  usePayments,
  usePettyCash,
  useClients,
} from '../hooks/useQueries';
import { toast } from 'sonner';
import { exportReportToExcel } from '../utils/exportToExcel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { nanoToDate } from '../utils/dates';
import type { Challan, Payment, PettyCash } from '../backend';

type ReportType = 'daily' | 'monthly' | 'alltime' | 'custom';

// Sentinel values for "All" options
const ALL_CLIENTS = 'ALL_CLIENTS';
const ALL_SITES = 'ALL_SITES';
const ALL_STATUS = 'ALL_STATUS';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('alltime');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>(ALL_CLIENTS);
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL_STATUS);
  const [isExporting, setIsExporting] = useState(false);

  const { data: allChallans = [], isLoading: challansLoading } = useChallans();
  const { data: allPayments = [], isLoading: paymentsLoading } = usePayments();
  const { data: allPettyCashWithAttachments = [], isLoading: pettyCashLoading } = usePettyCash();
  const { data: allClients = [] } = useClients();

  const isLoading = challansLoading || paymentsLoading || pettyCashLoading;

  // Extract PettyCash objects from PettyCashWithAttachments
  const allPettyCash = useMemo(() => {
    return allPettyCashWithAttachments.map((pc) => pc.pettyCash);
  }, [allPettyCashWithAttachments]);

  // Get all unique sites from challans and payments (for filter dropdown)
  const allSites = useMemo(() => {
    const challanSites = allChallans.map(c => c.site).filter(s => s && s.trim() !== '');
    const paymentSites = allPayments.map(p => p.site).filter(s => s && s.trim() !== '');
    return Array.from(new Set([...challanSites, ...paymentSites]));
  }, [allChallans, allPayments]);

  // Date validation for Custom report type
  const dateValidationError = useMemo(() => {
    if (reportType === 'custom') {
      if (!startDate || !endDate) {
        return 'Please select both Start Date and End Date for custom date range.';
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        return 'Start Date cannot be after End Date.';
      }
    }
    return null;
  }, [reportType, startDate, endDate]);

  // Apply filters to get the filtered dataset
  const filteredData = useMemo(() => {
    let filteredChallans = [...allChallans];
    let filteredPayments = [...allPayments];
    let filteredPettyCash = [...allPettyCash];

    // Date range filter - use rentDate for challans
    if (reportType === 'daily') {
      const date = new Date(selectedDate);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime() * 1_000_000;
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime() * 1_000_000;
      
      filteredChallans = filteredChallans.filter(c => 
        Number(c.rentDate) >= dayStart && Number(c.rentDate) <= dayEnd
      );
      filteredPayments = filteredPayments.filter(p => 
        Number(p.date) >= dayStart && Number(p.date) <= dayEnd
      );
      filteredPettyCash = filteredPettyCash.filter(pc => 
        Number(pc.date) >= dayStart && Number(pc.date) <= dayEnd
      );
    } else if (reportType === 'monthly') {
      const date = new Date(selectedDate);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime() * 1_000_000;
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).getTime() * 1_000_000;
      
      filteredChallans = filteredChallans.filter(c => 
        Number(c.rentDate) >= monthStart && Number(c.rentDate) <= monthEnd
      );
      filteredPayments = filteredPayments.filter(p => 
        Number(p.date) >= monthStart && Number(p.date) <= monthEnd
      );
      filteredPettyCash = filteredPettyCash.filter(pc => 
        Number(pc.date) >= monthStart && Number(pc.date) <= monthEnd
      );
    } else if (reportType === 'custom' && startDate && endDate && !dateValidationError) {
      const customStart = new Date(startDate).getTime() * 1_000_000;
      const customEnd = new Date(endDate + 'T23:59:59').getTime() * 1_000_000;
      
      filteredChallans = filteredChallans.filter(c => 
        Number(c.rentDate) >= customStart && Number(c.rentDate) <= customEnd
      );
      filteredPayments = filteredPayments.filter(p => 
        Number(p.date) >= customStart && Number(p.date) <= customEnd
      );
      filteredPettyCash = filteredPettyCash.filter(pc => 
        Number(pc.date) >= customStart && Number(pc.date) <= customEnd
      );
    }

    // Client filter (only apply if not "All Clients")
    if (selectedClient !== ALL_CLIENTS) {
      filteredChallans = filteredChallans.filter(c => c.clientName === selectedClient);
      filteredPayments = filteredPayments.filter(p => p.client === selectedClient);
    }

    // Site filter (only apply if not "All Sites")
    if (selectedSite !== ALL_SITES) {
      filteredChallans = filteredChallans.filter(c => c.site === selectedSite);
      filteredPayments = filteredPayments.filter(p => p.site === selectedSite);
      // Note: PettyCash no longer has site field, so we don't filter it by site
    }

    // Status filter (only apply if not "All Status")
    if (selectedStatus === 'active') {
      filteredChallans = filteredChallans.filter(c => !c.returned);
    } else if (selectedStatus === 'returned') {
      filteredChallans = filteredChallans.filter(c => c.returned);
    }

    return {
      challans: filteredChallans,
      payments: filteredPayments,
      pettyCash: filteredPettyCash,
    };
  }, [allChallans, allPayments, allPettyCash, reportType, selectedDate, startDate, endDate, selectedClient, selectedSite, selectedStatus, dateValidationError]);

  // Calculate summary metrics from filtered data
  const summary = useMemo(() => {
    const totalRent = filteredData.challans.reduce((sum, challan) => {
      const itemsTotal = challan.items.reduce(
        (s, item) => s + (item.quantity * item.rate * item.rentalDays),
        0
      );
      return sum + itemsTotal + challan.freight;
    }, 0);

    const totalReceived = filteredData.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate cash received (case-insensitive "CASH" mode)
    const cashReceived = filteredData.payments
      .filter(p => p.mode.toUpperCase() === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAmount = totalRent - totalReceived;
    const outstanding = pendingAmount > 0 ? pendingAmount : 0;
    const advance = pendingAmount < 0 ? Math.abs(pendingAmount) : 0;
    
    const pettyCashAdjustments = filteredData.pettyCash.reduce((sum, pc) => sum + pc.netChange, 0);

    return {
      totalRent,
      totalReceived,
      cashReceived,
      pendingAmount,
      outstanding,
      advance,
      pettyCashAdjustments,
    };
  }, [filteredData]);

  // Compute client-wise summary from filtered data
  const clientSummary = useMemo(() => {
    const clientMap = new Map<string, {
      totalRent: number;
      totalPayments: number;
    }>();

    // Aggregate rent from filtered challans
    filteredData.challans.forEach(challan => {
      const itemsTotal = challan.items.reduce(
        (sum, item) => sum + (item.quantity * item.rate * item.rentalDays),
        0
      );
      const total = itemsTotal + challan.freight;
      
      const existing = clientMap.get(challan.clientName) || { totalRent: 0, totalPayments: 0 };
      clientMap.set(challan.clientName, {
        ...existing,
        totalRent: existing.totalRent + total,
      });
    });

    // Aggregate payments from filtered payments
    filteredData.payments.forEach(payment => {
      const existing = clientMap.get(payment.client) || { totalRent: 0, totalPayments: 0 };
      clientMap.set(payment.client, {
        ...existing,
        totalPayments: existing.totalPayments + payment.amount,
      });
    });

    // Convert to array with outstanding/advance
    return Array.from(clientMap.entries()).map(([clientName, data]) => {
      const balance = data.totalRent - data.totalPayments;
      return {
        clientName,
        totalRent: data.totalRent,
        totalPayments: data.totalPayments,
        outstandingBalance: balance > 0 ? balance : 0,
        advance: balance < 0 ? Math.abs(balance) : 0,
      };
    });
  }, [filteredData]);

  // Compute inventory usage from filtered challans (for display only, not export)
  const inventoryUsage = useMemo(() => {
    const inventoryMap = new Map<string, {
      totalQuantity: number;
      issuedQuantity: number;
      dailyRate: number;
    }>();

    filteredData.challans.forEach(challan => {
      challan.items.forEach(item => {
        const existing = inventoryMap.get(item.itemName) || {
          totalQuantity: 0,
          issuedQuantity: 0,
          dailyRate: item.rate,
        };
        inventoryMap.set(item.itemName, {
          totalQuantity: existing.totalQuantity + item.quantity,
          issuedQuantity: existing.issuedQuantity + item.quantity,
          dailyRate: item.rate,
        });
      });
    });

    return Array.from(inventoryMap.entries()).map(([name, data]) => ({
      name,
      totalQuantity: data.totalQuantity,
      issuedQuantity: data.issuedQuantity,
      availableQuantity: 0,
      dailyRate: data.dailyRate,
    }));
  }, [filteredData]);

  const handleExport = async () => {
    // Validate dates for custom report type before export
    if (reportType === 'custom' && dateValidationError) {
      toast.error(dateValidationError);
      return;
    }

    setIsExporting(true);
    try {
      // Export without inventory data, passing filtered payments for per-row cash received calculation
      await exportReportToExcel({
        challans: filteredData.challans,
        payments: filteredData.payments,
        pettyCash: filteredData.pettyCash,
        clientBalances: clientSummary,
        summary,
      });

      toast.success('Master report.xls downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">View and export comprehensive reports</p>
        </div>
        <Button 
          onClick={handleExport} 
          disabled={isLoading || isExporting} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Download All'}
        </Button>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger id="reportType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="alltime">All-Time Report</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(reportType === 'daily' || reportType === 'monthly') && (
              <div className="space-y-2">
                <Label htmlFor="selectedDate">Select Date</Label>
                <Input
                  id="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                />
              </div>
            )}

            {reportType === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientFilter">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger id="clientFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLIENTS}>All Clients</SelectItem>
                  {allClients.map((client) => (
                    <SelectItem key={client.name} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteFilter">Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger id="siteFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SITES}>All Sites</SelectItem>
                  {allSites.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="statusFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {dateValidationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dateValidationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.totalRent.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{summary.totalReceived.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{summary.outstanding.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Advance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{summary.advance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <Tabs defaultValue="challans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="challans">Challans ({filteredData.challans.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({filteredData.payments.length})</TabsTrigger>
          <TabsTrigger value="pettycash">Petty Cash ({filteredData.pettyCash.length})</TabsTrigger>
          <TabsTrigger value="clients">Client Summary ({clientSummary.length})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Usage ({inventoryUsage.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="challans">
          <Card>
            <CardHeader>
              <CardTitle>Challans</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.challans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No challans found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Challan ID</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Rent Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.challans.map((challan) => {
                        const itemsTotal = challan.items.reduce(
                          (sum, item) => sum + (item.quantity * item.rate * item.rentalDays),
                          0
                        );
                        const total = itemsTotal + challan.freight;
                        const rentDate = nanoToDate(challan.rentDate);

                        return (
                          <TableRow key={challan.id}>
                            <TableCell className="font-medium">{challan.id}</TableCell>
                            <TableCell>{challan.clientName}</TableCell>
                            <TableCell>{challan.venue}</TableCell>
                            <TableCell>{rentDate.toLocaleDateString()}</TableCell>
                            <TableCell>{challan.numberOfDays}</TableCell>
                            <TableCell>{challan.items.length}</TableCell>
                            <TableCell className="text-right">₹{total.toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                challan.returned ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {challan.returned ? 'Returned' : 'Active'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payments found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.payments.map((payment) => {
                        const paymentDate = nanoToDate(payment.date);

                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">{payment.id}</TableCell>
                            <TableCell>{paymentDate.toLocaleDateString()}</TableCell>
                            <TableCell>{payment.client}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                                {payment.mode}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">₹{payment.amount.toFixed(2)}</TableCell>
                            <TableCell>{payment.referenceNumber || '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pettycash">
          <Card>
            <CardHeader>
              <CardTitle>Petty Cash</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredData.pettyCash.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No petty cash records found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead className="text-right">Net Change</TableHead>
                        <TableHead className="text-right">Closing Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.pettyCash.map((record) => {
                        const recordDate = nanoToDate(record.date);

                        return (
                          <TableRow key={record.date.toString()}>
                            <TableCell>{recordDate.toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              ₹{record.openingBalance.toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-right ${
                              record.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ₹{record.netChange.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{record.closingBalance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle>Client Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {clientSummary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No client data found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead className="text-right">Total Rent</TableHead>
                        <TableHead className="text-right">Total Payments</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-right">Advance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientSummary.map((client) => (
                        <TableRow key={client.clientName}>
                          <TableCell className="font-medium">{client.clientName}</TableCell>
                          <TableCell className="text-right">₹{client.totalRent.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{client.totalPayments.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ₹{client.outstandingBalance.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600">
                            ₹{client.advance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryUsage.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No inventory usage found for the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Total Quantity</TableHead>
                        <TableHead className="text-right">Issued Quantity</TableHead>
                        <TableHead className="text-right">Daily Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryUsage.map((item) => (
                        <TableRow key={item.name}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.totalQuantity}</TableCell>
                          <TableCell className="text-right">{item.issuedQuantity}</TableCell>
                          <TableCell className="text-right">₹{item.dailyRate.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
