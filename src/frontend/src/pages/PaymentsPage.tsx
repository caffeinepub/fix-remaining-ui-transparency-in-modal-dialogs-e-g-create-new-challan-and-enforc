import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Plus, Upload } from "lucide-react";
import React, { useState } from "react";
import { PaymentBulkUploadDialog } from "../components/payments/PaymentBulkUploadDialog";
import PaymentFormDialog from "../components/payments/PaymentFormDialog";
import { usePayments } from "../hooks/useQueries";
import { useStaffRestrictions } from "../hooks/useStaffRestrictions";
import { formatCurrency, formatDate, nanoToDate } from "../utils/dates";

function getPaymentModeVariant(
  mode: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (mode.toLowerCase()) {
    case "cash":
      return "default";
    case "online":
    case "upi":
      return "secondary";
    default:
      return "outline";
  }
}

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = usePayments();
  const { canBulkUpload } = useStaffRestrictions();
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const sorted = [...payments].sort((a, b) => Number(b.date - a.date));

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {payments.length} records
          </p>
        </div>
        <div className="flex gap-2">
          {canBulkUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
            >
              <Upload className="w-4 h-4 mr-1.5" />
              Bulk Upload
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Payment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length skeleton list
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payments yet</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Site</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {formatDate(nanoToDate(payment.date))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.client}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getPaymentModeVariant(payment.mode)}
                      className="text-xs"
                    >
                      {payment.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {payment.referenceNumber || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {payment.site || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaymentFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      {canBulkUpload && (
        <PaymentBulkUploadDialog
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          existingPayments={payments}
        />
      )}
    </div>
  );
}
