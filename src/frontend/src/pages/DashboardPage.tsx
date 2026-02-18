import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventory, useDashboardMetrics } from '../hooks/useQueries';
import { DollarSign, FileText, TrendingUp, Calendar, Package, AlertCircle, Wallet, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();

  const isLoading = inventoryLoading || metricsLoading;

  // Helper to format currency
  const formatCurrency = (value: number) => `₹${value.toFixed(2)}`;

  // Helper to format count
  const formatCount = (value: number) => value.toString();

  // Helper to get color classes based on metric type
  const getMetricColorClasses = (label: string) => {
    if (label.includes('Revenue') && !label.includes('Future')) {
      return 'text-green-700 bg-green-50 border-green-200';
    }
    if (label.includes('Pending')) {
      return 'text-red-700 bg-red-50 border-red-200';
    }
    if (label.includes('Future')) {
      return 'text-blue-700 bg-blue-50 border-blue-200';
    }
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const metricsData = [
    {
      title: 'Daily Metrics',
      items: [
        { label: 'Total Revenue', value: metrics?.daily.totalRevenue || 0, type: 'currency', icon: DollarSign },
        { label: 'Total Challan Count', value: metrics?.daily.totalChallanCount || 0, type: 'count', icon: FileText },
        { label: 'Cash Received', value: metrics?.daily.cashReceived || 0, type: 'currency', icon: Wallet },
        { label: 'Online Received', value: metrics?.daily.onlineReceived || 0, type: 'currency', icon: CreditCard },
        { label: 'Total Received', value: metrics?.daily.totalReceived || 0, type: 'currency', icon: TrendingUp },
        { label: 'Pending Amount', value: metrics?.daily.pendingAmount || 0, type: 'currency', icon: AlertCircle },
        { label: 'Cash in Hand', value: metrics?.daily.cashInHand || 0, type: 'currency', icon: Wallet },
        { label: 'Total Expenses (Expenses + Staff)', value: metrics?.daily.totalExpensesExpensesPlusStaff || 0, type: 'currency', icon: DollarSign },
        { label: 'Returned Challans', value: metrics?.daily.returnedChallans || 0, type: 'count', icon: Package },
      ],
    },
    {
      title: 'Monthly Metrics',
      items: [
        { label: 'Total Revenue', value: metrics?.monthly.totalRevenue || 0, type: 'currency', icon: DollarSign },
        { label: 'Total Challan Count', value: metrics?.monthly.totalChallanCount || 0, type: 'count', icon: FileText },
        { label: 'Cash Received', value: metrics?.monthly.cashReceived || 0, type: 'currency', icon: Wallet },
        { label: 'Online Received', value: metrics?.monthly.onlineReceived || 0, type: 'currency', icon: CreditCard },
        { label: 'Total Received', value: metrics?.monthly.totalReceived || 0, type: 'currency', icon: TrendingUp },
        { label: 'Pending Amount', value: metrics?.monthly.pendingAmount || 0, type: 'currency', icon: AlertCircle },
        { label: 'Cash in Hand', value: metrics?.monthly.cashInHand || 0, type: 'currency', icon: Wallet },
        { label: 'Total Expenses (Expenses + Staff)', value: metrics?.monthly.totalExpensesExpensesPlusStaff || 0, type: 'currency', icon: DollarSign },
        { label: 'Returned Challans', value: metrics?.monthly.returnedChallans || 0, type: 'count', icon: Package },
      ],
    },
    {
      title: 'All-Time Metrics',
      items: [
        { label: 'Total Revenue', value: metrics?.allTime.totalRevenue || 0, type: 'currency', icon: DollarSign },
        { label: 'Total Challan Count', value: metrics?.allTime.totalChallanCount || 0, type: 'count', icon: FileText },
        { label: 'Cash Received', value: metrics?.allTime.cashReceived || 0, type: 'currency', icon: Wallet },
        { label: 'Online Received', value: metrics?.allTime.onlineReceived || 0, type: 'currency', icon: CreditCard },
        { label: 'Total Received', value: metrics?.allTime.totalReceived || 0, type: 'currency', icon: TrendingUp },
        { label: 'Pending Amount', value: metrics?.allTime.pendingAmount || 0, type: 'currency', icon: AlertCircle },
        { label: 'Cash in Hand', value: metrics?.allTime.cashInHand || 0, type: 'currency', icon: Wallet },
        { label: 'Total Expenses (Expenses + Staff)', value: metrics?.allTime.totalExpensesExpensesPlusStaff || 0, type: 'currency', icon: DollarSign },
        { label: 'Returned Challans', value: metrics?.allTime.returnedChallans || 0, type: 'count', icon: Package },
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of your rental business metrics</p>
      </div>

      {/* Future Metrics Section - Separate from period metrics */}
      <Card className="border-blue-300 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Future Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between rounded-md border border-blue-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-700" />
              <span className="text-sm font-medium text-blue-900">Future Challans</span>
            </div>
            <span className="text-base font-bold text-blue-900">
              {formatCount(metrics?.future.futureChallans || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-blue-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-700" />
              <span className="text-sm font-medium text-blue-900">Future Revenue</span>
            </div>
            <span className="text-base font-bold text-blue-900">
              {formatCurrency(metrics?.future.futureRevenue || 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Period-based Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metricsData.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const displayValue = item.type === 'currency' 
                  ? formatCurrency(item.value) 
                  : formatCount(item.value);
                const colorClasses = getMetricColorClasses(item.label);
                
                return (
                  <div 
                    key={item.label} 
                    className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${colorClasses}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-base font-bold">
                      {displayValue}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory?.length || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventory?.reduce((sum, item) => sum + item.totalQuantity, 0) || 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">
                {inventory?.reduce((sum, item) => sum + item.availableQuantity, 0) || 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Issued</p>
              <p className="text-2xl font-bold text-orange-600">
                {inventory?.reduce((sum, item) => sum + item.issuedQuantity, 0) || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
