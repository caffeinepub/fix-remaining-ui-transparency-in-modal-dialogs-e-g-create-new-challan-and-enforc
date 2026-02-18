import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Loader2, Printer } from 'lucide-react';
import {
  useAddPettyCash,
  useUpdatePettyCash,
  useGetCashReceivedForDate,
  useGetPettyCashAttachments,
} from '../../hooks/useQueries';
import { dateToNano, nanoToDate } from '../../utils/dates';
import { toast } from 'sonner';
import type { PettyCash, PettyCashCategory } from '../../backend';
import PettyCashAttachmentsSection from './PettyCashAttachmentsSection';
import { generatePettyCashPDF } from '../../utils/pettyCashPdf';

interface PettyCashFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: PettyCash | null;
}

export default function PettyCashFormDialog({
  open,
  onClose,
  record,
}: PettyCashFormDialogProps) {
  const addPettyCash = useAddPettyCash();
  const updatePettyCash = useUpdatePettyCash();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    openingBalance: '',
    cashFromMd: '',
    expenses: '',
    staffAdvance: '',
    handoverToMd: '',
    transferFromCashEquivalents: '',
    remarks: '',
  });

  const [categories, setCategories] = useState<Array<{ title: string; amount: string }>>([
    { title: '', amount: '' },
  ]);

  const dateNano = dateToNano(new Date(formData.date));
  const { data: cashReceived, isLoading: cashReceivedLoading } =
    useGetCashReceivedForDate(dateNano);

  const [isSavingAndPrinting, setIsSavingAndPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      if (record) {
        const recordDate = nanoToDate(record.date);
        setFormData({
          date: recordDate.toISOString().split('T')[0],
          openingBalance: record.openingBalance.toString(),
          cashFromMd: record.cashFromMd.toString(),
          expenses: record.expenses.toString(),
          staffAdvance: record.staffAdvance.toString(),
          handoverToMd: record.handoverToMd.toString(),
          transferFromCashEquivalents: record.transferFromCashEquivalents.toString(),
          remarks: record.remarks,
        });
        setCategories(
          record.categoryExpenses.length > 0
            ? record.categoryExpenses.map((cat) => ({
                title: cat.title,
                amount: cat.amount.toString(),
              }))
            : [{ title: '', amount: '' }]
        );
      } else {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          openingBalance: '',
          cashFromMd: '',
          expenses: '',
          staffAdvance: '',
          handoverToMd: '',
          transferFromCashEquivalents: '',
          remarks: '',
        });
        setCategories([{ title: '', amount: '' }]);
      }
    }
  }, [open, record]);

  const addCategory = () => {
    setCategories([...categories, { title: '', amount: '' }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const updateCategory = (index: number, field: 'title' | 'amount', value: string) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], [field]: value };
    setCategories(newCategories);
  };

  const calculateNetChange = () => {
    const opening = parseFloat(formData.openingBalance) || 0;
    const cashFromMd = parseFloat(formData.cashFromMd) || 0;
    const expenses = parseFloat(formData.expenses) || 0;
    const staffAdvance = parseFloat(formData.staffAdvance) || 0;
    const handoverToMd = parseFloat(formData.handoverToMd) || 0;
    const transferFromCashEquivalents = parseFloat(formData.transferFromCashEquivalents) || 0;
    const cashReceivedValue = cashReceived || 0;

    return (
      opening +
      cashFromMd +
      transferFromCashEquivalents +
      cashReceivedValue -
      expenses -
      staffAdvance -
      handoverToMd
    );
  };

  const calculateClosingBalance = () => {
    return calculateNetChange();
  };

  const handleSubmit = async (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();

    if (shouldPrint) {
      setIsSavingAndPrinting(true);
    }

    const categoryExpenses: PettyCashCategory[] = categories
      .filter((cat) => cat.title.trim() && cat.amount.trim())
      .map((cat) => ({
        title: cat.title.trim(),
        amount: parseFloat(cat.amount),
      }));

    const data = {
      date: dateToNano(new Date(formData.date)),
      openingBalance: parseFloat(formData.openingBalance) || 0,
      cashFromMd: parseFloat(formData.cashFromMd) || 0,
      expenses: parseFloat(formData.expenses) || 0,
      staffAdvance: parseFloat(formData.staffAdvance) || 0,
      handoverToMd: parseFloat(formData.handoverToMd) || 0,
      netChange: calculateNetChange(),
      closingBalance: calculateClosingBalance(),
      transferFromCashEquivalents: parseFloat(formData.transferFromCashEquivalents) || 0,
      categoryExpenses,
      remarks: formData.remarks.trim(),
    };

    try {
      if (record) {
        await updatePettyCash.mutateAsync({
          originalDate: record.date,
          ...data,
        });
        toast.success('Petty cash record updated successfully');
      } else {
        await addPettyCash.mutateAsync(data);
        toast.success('Petty cash record added successfully');
      }

      if (shouldPrint) {
        try {
          const pettyCashData = {
            date: formData.date,
            openingBalance: data.openingBalance,
            cashReceivedAuto: cashReceived || 0,
            cashFromMd: data.cashFromMd,
            expenses: data.expenses,
            staffAdvance: data.staffAdvance,
            handoverToMd: data.handoverToMd,
            netChange: data.netChange,
            closingBalance: data.closingBalance,
            remarks: data.remarks,
          };

          const result = await generatePettyCashPDF(pettyCashData, data.date);

          if (result.success) {
            if (result.printWarning) {
              toast.warning(result.printWarning);
            } else {
              toast.success('PDF downloaded and print dialog opened');
            }
          }
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          toast.error('Record saved, but PDF generation failed');
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving petty cash:', error);
      toast.error('Failed to save petty cash record');
    } finally {
      if (shouldPrint) {
        setIsSavingAndPrinting(false);
      }
    }
  };

  const isSubmitting = addPettyCash.isPending || updatePettyCash.isPending || isSavingAndPrinting;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background opacity-100 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Petty Cash Record' : 'Add Petty Cash Record'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={!!record}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Opening Balance (₹) *</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="0.01"
                  value={formData.openingBalance}
                  onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashFromMd">Cash from MD (₹)</Label>
                <Input
                  id="cashFromMd"
                  type="number"
                  step="0.01"
                  value={formData.cashFromMd}
                  onChange={(e) => setFormData({ ...formData, cashFromMd: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferFromCashEquivalents">
                  Transfer from Cash Equivalents (₹)
                </Label>
                <Input
                  id="transferFromCashEquivalents"
                  type="number"
                  step="0.01"
                  value={formData.transferFromCashEquivalents}
                  onChange={(e) =>
                    setFormData({ ...formData, transferFromCashEquivalents: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashReceived">Cash Received (Auto) (₹)</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  value={cashReceivedLoading ? '' : (cashReceived || 0).toFixed(2)}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated from CASH payments on this date
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenses">Expenses (₹)</Label>
                <Input
                  id="expenses"
                  type="number"
                  step="0.01"
                  value={formData.expenses}
                  onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffAdvance">Staff Advance (₹)</Label>
                <Input
                  id="staffAdvance"
                  type="number"
                  step="0.01"
                  value={formData.staffAdvance}
                  onChange={(e) => setFormData({ ...formData, staffAdvance: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handoverToMd">Handover to MD (₹)</Label>
                <Input
                  id="handoverToMd"
                  type="number"
                  step="0.01"
                  value={formData.handoverToMd}
                  onChange={(e) => setFormData({ ...formData, handoverToMd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Category Expenses</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 space-y-1">
                      <Label className="text-xs">Category Title</Label>
                      <Input
                        value={category.title}
                        onChange={(e) => updateCategory(index, 'title', e.target.value)}
                        placeholder="e.g., Transportation"
                      />
                    </div>

                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={category.amount}
                        onChange={(e) => updateCategory(index, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCategory(index)}
                        disabled={categories.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                placeholder="Optional notes..."
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Net Change:</span>
                <span className="text-lg font-bold">₹{calculateNetChange().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Closing Balance:</span>
                <span className="text-lg font-bold">₹{calculateClosingBalance().toFixed(2)}</span>
              </div>
            </div>

            {!record && (
              <PettyCashAttachmentsSection date={dateNano} />
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && !isSavingAndPrinting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {record ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>{record ? 'Update' : 'Add'}</>
              )}
            </Button>
            {!record && (
              <Button
                type="button"
                variant="secondary"
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
              >
                {isSavingAndPrinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving & Printing...
                  </>
                ) : (
                  <>
                    <Printer className="mr-2 h-4 w-4" />
                    Save & Print PDF
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
