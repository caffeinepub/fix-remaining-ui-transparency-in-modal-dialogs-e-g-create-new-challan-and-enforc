import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { usePayments } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import PaymentFormDialog from '../components/payments/PaymentFormDialog';
import PaymentBulkUploadDialog from '../components/payments/PaymentBulkUploadDialog';
import { formatCurrency, formatDate } from '../utils/dates';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QueryErrorState from '../components/common/QueryErrorState';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const { data: payments, isLoading, error, refetch } = usePayments();
  const { canBulkUpload, disabledReason } = useStaffRestrictions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const handleBulkUploadClick = () => {
    if (!canBulkUpload) {
      toast.error(disabledReason || 'Bulk upload is not available');
      return;
    }
    setIsBulkUploadOpen(true);
  };

  if (error) {
    return <QueryErrorState error={error} onRetry={refetch} />;
  }

  const getPaymentModeColor = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'upi':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bank transfer':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cheque':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-gray-600 mt-1">Manage all payment records</p>
        </div>
        <div className="flex gap-2">
          {canBulkUpload && (
            <Button
              onClick={handleBulkUploadClick}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
          )}
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading payments...</p>
        </div>
      ) : payments && payments.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference Number</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(new Date(Number(payment.date) / 1_000_000))}</TableCell>
                  <TableCell className="font-medium">{payment.client}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getPaymentModeColor(payment.mode)}>
                      {payment.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-gray-600">{payment.referenceNumber || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No payments found</p>
          <Button onClick={() => setIsFormOpen(true)} className="mt-4">
            Add Your First Payment
          </Button>
        </div>
      )}

      <PaymentFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} />
      {canBulkUpload && (
        <PaymentBulkUploadDialog open={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} />
      )}
    </div>
  );
}
