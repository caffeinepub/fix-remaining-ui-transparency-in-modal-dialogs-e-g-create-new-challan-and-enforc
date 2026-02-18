import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Upload, Download } from 'lucide-react';
import { usePettyCash } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import PettyCashFormDialog from '../components/petty-cash/PettyCashFormDialog';
import PettyCashBulkUploadDialog from '../components/petty-cash/PettyCashBulkUploadDialog';
import QueryErrorState from '../components/common/QueryErrorState';
import { generatePettyCashPDF } from '../utils/pettyCashPdf';
import { toast } from 'sonner';

export default function PettyCashPage() {
  const { data: pettyCash, isLoading, error, refetch } = usePettyCash();
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

  const handleDownloadPDF = async (record: any) => {
    try {
      await generatePettyCashPDF(record.pettyCash, record.attachments);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (error) {
    return <QueryErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Petty Cash</h1>
          <p className="text-gray-600 mt-1">Track daily petty cash transactions</p>
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
            Add Record
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading petty cash records...</p>
        </div>
      ) : pettyCash && pettyCash.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-right">Cash from MD</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Staff Advance</TableHead>
                <TableHead className="text-right">Handover to MD</TableHead>
                <TableHead className="text-right">Closing Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pettyCash.map((record) => (
                <TableRow key={Number(record.pettyCash.date)}>
                  <TableCell>
                    {new Date(Number(record.pettyCash.date) / 1_000_000).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{record.pettyCash.openingBalance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{record.pettyCash.cashFromMd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{record.pettyCash.expenses.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{record.pettyCash.staffAdvance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{record.pettyCash.handoverToMd.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{record.pettyCash.closingBalance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadPDF(record)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">No petty cash records found</p>
          <Button onClick={() => setIsFormOpen(true)} className="mt-4">
            Add Your First Record
          </Button>
        </div>
      )}

      <PettyCashFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} />
      {canBulkUpload && (
        <PettyCashBulkUploadDialog open={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} />
      )}
    </div>
  );
}
