import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientBalances } from '../hooks/useQueries';
import { formatCurrency } from '../utils/dates';

export default function ClientBalancesPage() {
  const { data: balances, isLoading } = useClientBalances();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Client Balances</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">Loading client balances...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Balances</h1>
          <p className="text-sm text-gray-600 mt-1">View outstanding and advance balances for all clients</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Balance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {!balances || balances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No client balances to display. Create challans and payments to see balances.
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
                  {balances.map((balance) => {
                    const outstanding = balance.balance > 0 ? balance.balance : 0;
                    const advance = balance.balance < 0 ? Math.abs(balance.balance) : 0;
                    
                    return (
                      <TableRow key={balance.clientName}>
                        <TableCell className="font-medium">{balance.clientName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(balance.totalRent)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(balance.totalPayments)}</TableCell>
                        <TableCell className="text-right">
                          {outstanding > 0 ? (
                            <span className="text-red-600 font-semibold">
                              {formatCurrency(outstanding)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {advance > 0 ? (
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(advance)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
    </div>
  );
}
