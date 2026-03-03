import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Printer } from 'lucide-react';
import { useAddPettyCash, useUpdatePettyCash, usePayments } from '../../hooks/useQueries';
import type { PettyCash } from '../../backend';
import { dateToNano, nanoToDate } from '../../utils/dates';
import { generateAndPrintPettyCashPdf } from '../../utils/pettyCashPdf';
import PettyCashAttachmentsSection from './PettyCashAttachmentsSection';

interface PettyCashFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: PettyCash | null;
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDateToInputValue(nanos: bigint): string {
  const date = nanoToDate(nanos);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PettyCashFormDialog({ open, onOpenChange, editRecord }: PettyCashFormDialogProps) {
  const addPettyCash = useAddPettyCash();
  const updatePettyCash = useUpdatePettyCash();
  const { data: allPayments } = usePayments();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [date, setDate] = useState(todayStr);
  const [openingBalance, setOpeningBalance] = useState('');
  const [cashFromMd, setCashFromMd] = useState('');
  const [transferFromCashEquivalents, setTransferFromCashEquivalents] = useState('');
  const [expenses, setExpenses] = useState('');
  const [staffAdvance, setStaffAdvance] = useState('');
  const [handoverToMd, setHandoverToMd] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSavingAndPrinting, setIsSavingAndPrinting] = useState(false);
  const [error, setError] = useState('');

  // Compute the date as bigint nanos for the attachments section
  const dateNano = React.useMemo(() => {
    if (!date) return BigInt(0);
    return dateToNano(new Date(date));
  }, [date]);

  // Auto-calculate Cash Received (Auto) from CASH-mode payments on the selected date
  const cashReceivedAuto = React.useMemo(() => {
    if (!allPayments || !date) return 0;
    const selectedDate = new Date(date);
    const startOfDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    return allPayments
      .filter((p) => {
        const paymentDate = Number(p.date) / 1_000_000;
        return (
          p.mode.toLowerCase() === 'cash' &&
          paymentDate >= startOfDay &&
          paymentDate <= endOfDay
        );
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [allPayments, date]);

  // Net Change = Opening Balance + Cash from MD + Transfer from Cash Equivalents + Cash Received (Auto) − Expenses − Staff Advance − Handover to MD
  const netChange = React.useMemo(() => {
    const ob = parseFloat(openingBalance) || 0;
    const cmd = parseFloat(cashFromMd) || 0;
    const tce = parseFloat(transferFromCashEquivalents) || 0;
    const exp = parseFloat(expenses) || 0;
    const sa = parseFloat(staffAdvance) || 0;
    const hmd = parseFloat(handoverToMd) || 0;
    return ob + cmd + tce + cashReceivedAuto - exp - sa - hmd;
  }, [openingBalance, cashFromMd, transferFromCashEquivalents, cashReceivedAuto, expenses, staffAdvance, handoverToMd]);

  const closingBalance = netChange;

  useEffect(() => {
    if (open) {
      if (editRecord) {
        setDate(parseDateToInputValue(editRecord.date));
        setOpeningBalance(String(editRecord.openingBalance));
        setCashFromMd(String(editRecord.cashFromMd));
        setTransferFromCashEquivalents(String(editRecord.transferFromCashEquivalents));
        setExpenses(String(editRecord.expenses));
        setStaffAdvance(String(editRecord.staffAdvance));
        setHandoverToMd(String(editRecord.handoverToMd));
        setRemarks(editRecord.remarks || '');
      } else {
        setDate(todayStr);
        setOpeningBalance('');
        setCashFromMd('');
        setTransferFromCashEquivalents('');
        setExpenses('');
        setStaffAdvance('');
        setHandoverToMd('');
        setRemarks('');
      }
      setError('');
      setIsSavingAndPrinting(false);
    }
  }, [open, editRecord]);

  const handleSubmit = async (print: boolean) => {
    setError('');
    if (!date) {
      setError('Please select a date.');
      return;
    }

    if (print) setIsSavingAndPrinting(true);

    const recordDateNano = dateToNano(new Date(date));
    const ob = parseFloat(openingBalance) || 0;
    const cmd = parseFloat(cashFromMd) || 0;
    const tce = parseFloat(transferFromCashEquivalents) || 0;
    const exp = parseFloat(expenses) || 0;
    const sa = parseFloat(staffAdvance) || 0;
    const hmd = parseFloat(handoverToMd) || 0;

    try {
      if (editRecord) {
        await updatePettyCash.mutateAsync({
          originalDate: editRecord.date,
          openingBalance: ob,
          cashFromMd: cmd,
          expenses: exp,
          staffAdvance: sa,
          handoverToMd: hmd,
          transferFromCashEquivalents: tce,
          categoryExpenses: [],
          remarks,
          cashReceivedAuto,
        });
      } else {
        await addPettyCash.mutateAsync({
          date: recordDateNano,
          openingBalance: ob,
          cashFromMd: cmd,
          expenses: exp,
          staffAdvance: sa,
          handoverToMd: hmd,
          transferFromCashEquivalents: tce,
          categoryExpenses: [],
          remarks,
          cashReceivedAuto,
        });
      }

      if (print) {
        const record: PettyCash = {
          date: recordDateNano,
          openingBalance: ob,
          cashFromMd: cmd,
          expenses: exp,
          staffAdvance: sa,
          handoverToMd: hmd,
          transferFromCashEquivalents: tce,
          categoryExpenses: [],
          remarks,
          cashReceivedAuto,
          netChange,
          closingBalance,
          createdAt: dateToNano(new Date()),
        };
        try {
          await generateAndPrintPettyCashPdf(record, []);
        } catch (pdfErr) {
          console.warn('PDF generation warning:', pdfErr);
        }
      }

      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save petty cash record:', err);
      setError(err?.message || 'Failed to save petty cash record. Please try again.');
    } finally {
      setIsSavingAndPrinting(false);
    }
  };

  const isPending = addPettyCash.isPending || updatePettyCash.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background opacity-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit Petty Cash Record' : 'Add Petty Cash Record'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="pc-date">Date</Label>
            <Input
              id="pc-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!!editRecord}
            />
          </div>

          {/* Opening Balance */}
          <div className="space-y-1">
            <Label htmlFor="pc-opening">Opening Balance (₹)</Label>
            <Input
              id="pc-opening"
              type="number"
              placeholder="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>

          {/* Cash from MD */}
          <div className="space-y-1">
            <Label htmlFor="pc-cashmd">Cash from MD (₹)</Label>
            <Input
              id="pc-cashmd"
              type="number"
              placeholder="0"
              value={cashFromMd}
              onChange={(e) => setCashFromMd(e.target.value)}
            />
          </div>

          {/* Transfer from Cash Equivalents */}
          <div className="space-y-1">
            <Label htmlFor="pc-transfer">Transfer from Cash Equivalents (₹)</Label>
            <Input
              id="pc-transfer"
              type="number"
              placeholder="0"
              value={transferFromCashEquivalents}
              onChange={(e) => setTransferFromCashEquivalents(e.target.value)}
            />
          </div>

          {/* Cash Received (Auto) - read only */}
          <div className="space-y-1">
            <Label htmlFor="pc-cashreceived">Cash Received (Auto) (₹)</Label>
            <Input
              id="pc-cashreceived"
              type="number"
              value={cashReceivedAuto}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated from CASH-mode payments on the selected date.
            </p>
          </div>

          {/* Expenses */}
          <div className="space-y-1">
            <Label htmlFor="pc-expenses">Expenses (₹)</Label>
            <Input
              id="pc-expenses"
              type="number"
              placeholder="0"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
            />
          </div>

          {/* Staff Advance */}
          <div className="space-y-1">
            <Label htmlFor="pc-staffadvance">Staff Advance (₹)</Label>
            <Input
              id="pc-staffadvance"
              type="number"
              placeholder="0"
              value={staffAdvance}
              onChange={(e) => setStaffAdvance(e.target.value)}
            />
          </div>

          {/* Handover to MD */}
          <div className="space-y-1">
            <Label htmlFor="pc-handover">Handover to MD (₹)</Label>
            <Input
              id="pc-handover"
              type="number"
              placeholder="0"
              value={handoverToMd}
              onChange={(e) => setHandoverToMd(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <Label htmlFor="pc-remarks">Remarks</Label>
            <Textarea
              id="pc-remarks"
              placeholder="Optional remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>

          {/* Computed values */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Change</span>
              <span className={`font-semibold ${netChange >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(netChange)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Closing Balance</span>
              <span className={`font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(closingBalance)}
              </span>
            </div>
          </div>

          {/* Attachments - uses the existing component that takes only `date` */}
          <PettyCashAttachmentsSection date={dateNano} />
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isPending}
          >
            {isSavingAndPrinting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Save & Print PDF
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isPending}
          >
            {isPending && !isSavingAndPrinting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {editRecord ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PettyCashFormDialog;
