import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import React from "react";
import { useClientBalances } from "../hooks/useQueries";
import { formatCurrency } from "../utils/dates";

export default function ClientBalancesPage() {
  const balances = useClientBalances();

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Client Balances</h1>
        <p className="text-sm text-muted-foreground">
          Outstanding and advance balances per client
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Balance Summary ({balances.length} clients)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No client balances to display. Create challans and payments to see
              balances.
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
                  {balances.map((balance) => (
                    <TableRow key={balance.clientName}>
                      <TableCell className="font-medium">
                        {balance.clientName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balance.totalRent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(balance.totalPayments)}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.outstanding > 0 ? (
                          <span className="text-destructive font-semibold">
                            {formatCurrency(balance.outstanding)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.advance > 0 ? (
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(balance.advance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
