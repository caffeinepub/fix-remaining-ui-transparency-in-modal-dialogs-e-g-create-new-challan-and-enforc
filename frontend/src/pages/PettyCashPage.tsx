import React, { useState } from 'react';
import { usePettyCash, useDeletePettyCash } from '../hooks/useQueries';
import { useStaffRestrictions } from '../hooks/useStaffRestrictions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, Upload, Wallet } from 'lucide-react';
import { PettyCashFormDialog } from '../components/petty-cash/PettyCashFormDialog';
import { PettyCashBulkUploadDialog } from '../components/petty-cash/PettyCashBulkUploadDialog';
import { nanoToDate } from '../utils/dates';
import type { PettyCash, PettyCashWithAttachments } from '../backend';
import { toast } from 'sonner';

function fmtDate(nanos: bigint): string {
  return nanoToDate(nanos).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtCur(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PettyCashPage() {
  const { data: pettyCashWithAttachments = [], isLoading } = usePettyCash();
  const deletePettyCash = useDeletePettyCash();
  const { canDelete, canBulkUpload } = useStaffRestrictions();

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PettyCash | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const records = pettyCashWithAttachments as PettyCashWithAttachments[];
  const sortedRecords = [...records].sort(
    (a, b) => Number(b.pettyCash.date) - Number(a.pettyCash.date)
  );

  const handleEdit = (record: PettyCash) => {
    setEditRecord(record);
    setFormOpen(true);
  };

  const handleDelete = async (date: bigint) => {
    if (!window.confirm('Delete this petty cash record?')) return;
    deletePettyCash.mutate(date, {
      onSuccess: () => toast.success('Record deleted'),
      onError: (e) => toast.error(`Delete failed: ${e.message}`),
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Petty Cash</h1>
          <p className="text-sm text-muted-foreground">Daily cash management records</p>
        </div>
        <div className="flex gap-2">
          {canBulkUpload && (
            <Button variant="outline" size="sm" onClick={() => setBulkUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              Bulk Upload
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditRecord(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Record
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : sortedRecords.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No petty cash records yet</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Cash from MD</TableHead>
                <TableHead className="text-right">Transfer</TableHead>
                <TableHead className="text-right">Cash Received</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Staff Adv.</TableHead>
                <TableHead className="text-right">Handover MD</TableHead>
                <TableHead className="text-right">Net Change</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRecords.map(({ pettyCash: record }) => {
                const netChange = record.netChange;
                const closing = record.closingBalance;
                return (
                  <TableRow key={record.date.toString()}>
                    <TableCell className="font-medium whitespace-nowrap">{fmtDate(record.date)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.openingBalance)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.cashFromMd)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.transferFromCashEquivalents)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.cashReceivedAuto)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.expenses)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.staffAdvance)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtCur(record.handoverToMd)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={netChange >= 0 ? 'default' : 'destructive'} className="text-xs">
                        {fmtCur(netChange)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={closing >= 0 ? 'text-green-600 font-semibold text-sm' : 'text-destructive font-semibold text-sm'}>
                        {fmtCur(closing)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[120px] truncate">
                      {record.remarks || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(record)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(record.date)}
                            disabled={deletePettyCash.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PettyCashFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditRecord(null); }}
        editRecord={editRecord}
      />

      <PettyCashBulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        existingRecords={records}
      />
    </div>
  );
}
