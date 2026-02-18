import { useEffect, useState } from 'react';
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
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAddInventoryItem, useUpdateInventoryItem, useInventory } from '../../hooks/useQueries';
import { useMutationGate } from '../../hooks/useMutationGate';
import { normalizeError } from '../../utils/errors';
import type { InventoryItem } from '../../backend';
import { toast } from 'sonner';
import SignInRequiredDialog from '../common/SignInRequiredDialog';

interface InventoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}

/**
 * Dialog form for adding/editing inventory items with mutation gating, actor readiness checks,
 * sign-in prompts on authorization failures, inline loading/error states, and refined submission
 * failure messaging to reliably surface the full user-facing error for verification testing
 */
export default function InventoryFormDialog({ open, onClose, item }: InventoryFormDialogProps) {
  const addItem = useAddInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const { data: inventory } = useInventory();
  const mutationGate = useMutationGate();

  const [formData, setFormData] = useState({
    name: '',
    totalQuantity: '',
    dailyRate: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSignInDialog, setShowSignInDialog] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setFormData({
          name: item.name,
          totalQuantity: item.totalQuantity.toString(),
          dailyRate: item.dailyRate.toString(),
        });
      } else {
        setFormData({
          name: '',
          totalQuantity: '',
          dailyRate: '',
        });
      }
      setValidationError(null);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!mutationGate.canMutate) {
      if (mutationGate.reason === 'not-authenticated') {
        setShowSignInDialog(true);
      } else {
        toast.error(mutationGate.reason || 'Cannot perform this action');
      }
      return;
    }

    const totalQuantity = parseFloat(formData.totalQuantity);
    const dailyRate = parseFloat(formData.dailyRate);

    if (isNaN(totalQuantity) || totalQuantity <= 0) {
      setValidationError('Total quantity must be greater than 0');
      return;
    }

    if (isNaN(dailyRate) || dailyRate <= 0) {
      setValidationError('Daily rate must be greater than 0');
      return;
    }

    if (!item) {
      const existingItem = inventory?.find((inv) => inv.name === formData.name);
      if (existingItem) {
        setValidationError('An item with this name already exists');
        return;
      }
    }

    try {
      if (item) {
        await updateItem.mutateAsync({
          name: formData.name,
          totalQuantity,
          dailyRate,
        });
        toast.success('Inventory item updated successfully');
      } else {
        await addItem.mutateAsync({
          name: formData.name,
          totalQuantity,
          dailyRate,
        });
        toast.success('Inventory item added successfully');
      }
      onClose();
    } catch (error) {
      const errorMessage = normalizeError(error);
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('sign in')) {
        setShowSignInDialog(true);
      } else {
        setValidationError(errorMessage);
      }
    }
  };

  const isSubmitting = addItem.isPending || updateItem.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-background opacity-100 max-w-md">
          <DialogHeader>
            <DialogTitle>{item ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!!item || isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalQuantity">Total Quantity *</Label>
              <Input
                id="totalQuantity"
                type="number"
                step="0.01"
                value={formData.totalQuantity}
                onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyRate">Daily Rate (₹) *</Label>
              <Input
                id="dailyRate"
                type="number"
                step="0.01"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                disabled={isSubmitting}
                required
              />
            </div>

            {validationError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {item ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  <>{item ? 'Update' : 'Add'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SignInRequiredDialog open={showSignInDialog} onClose={() => setShowSignInDialog(false)} />
    </>
  );
}
