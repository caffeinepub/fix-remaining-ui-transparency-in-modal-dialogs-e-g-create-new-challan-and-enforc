import React, { useState, useEffect } from 'react';
import { useAddInventoryItem, useUpdateInventoryItem } from '../../hooks/useQueries';
import type { InventoryItem } from '../../backend';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: InventoryItem | null;
  existingItems: InventoryItem[];
}

export default function InventoryFormDialog({ open, onOpenChange, editItem, existingItems }: Props) {
  const addItem = useAddInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const [name, setName] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (open) {
      setName(editItem?.name || '');
      setTotalQuantity(editItem ? String(editItem.totalQuantity) : '');
      setDailyRate(editItem ? String(editItem.dailyRate) : '');
      setNameError('');
    }
  }, [open, editItem]);

  const isEditing = !!editItem;
  const isPending = addItem.isPending || updateItem.isPending;

  const validate = () => {
    if (!name.trim()) { setNameError('Name is required'); return false; }
    if (!isEditing) {
      const dup = existingItems.find(i => i.name.toLowerCase() === name.trim().toLowerCase());
      if (dup) { setNameError('An item with this name already exists'); return false; }
    }
    if (!totalQuantity || parseFloat(totalQuantity) <= 0) { toast.error('Total quantity must be > 0'); return false; }
    if (!dailyRate || parseFloat(dailyRate) <= 0) { toast.error('Daily rate must be > 0'); return false; }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const params = {
      name: name.trim(),
      totalQuantity: parseFloat(totalQuantity),
      dailyRate: parseFloat(dailyRate),
    };

    if (isEditing) {
      updateItem.mutate(params, {
        onSuccess: () => { toast.success('Item updated'); onOpenChange(false); },
        onError: (e) => toast.error(`Update failed: ${e.message}`),
      });
    } else {
      addItem.mutate(params, {
        onSuccess: () => { toast.success('Item added'); onOpenChange(false); },
        onError: (e) => toast.error(`Add failed: ${e.message}`),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background opacity-100 max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item' : 'Add Inventory Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item Name</Label>
            <Input
              value={name}
              onChange={e => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g. Tent 20x30"
              disabled={isEditing}
            />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Total Quantity</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={totalQuantity}
              onChange={e => setTotalQuantity(e.target.value)}
              placeholder="e.g. 10"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Daily Rate (₹)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={dailyRate}
              onChange={e => setDailyRate(e.target.value)}
              placeholder="e.g. 500"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
