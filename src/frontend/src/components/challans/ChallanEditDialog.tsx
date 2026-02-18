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
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModalSelectContent } from '@/components/common/ModalSelectContent';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useUpdateChallan, useClients, useInventory } from '../../hooks/useQueries';
import { calculateRentalDays, dateToNano, nanoToDate } from '../../utils/dates';
import { calculateFormItemTotal } from '../../utils/challanTotals';
import { normalizeError } from '../../utils/errors';
import type { Challan, ChallanItem } from '../../backend';
import { toast } from 'sonner';

interface ChallanEditDialogProps {
  open: boolean;
  onClose: () => void;
  challan: Challan | null;
}

export default function ChallanEditDialog({ open, onClose, challan }: ChallanEditDialogProps) {
  const updateChallan = useUpdateChallan();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();

  const [formData, setFormData] = useState({
    clientName: '',
    venue: '',
    freight: '',
    startDate: '',
    endDate: '',
    site: '',
  });

  const [items, setItems] = useState<Array<{ itemName: string; quantity: string; rate: string }>>([
    { itemName: '', quantity: '', rate: '' },
  ]);

  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && challan) {
      if (challan.returned) {
        toast.error('Cannot edit a returned challan');
        onClose();
        return;
      }

      const rentDate = nanoToDate(challan.rentDate);
      const returnDate = new Date(rentDate);
      returnDate.setDate(returnDate.getDate() + challan.numberOfDays);

      setFormData({
        clientName: challan.clientName,
        venue: challan.venue,
        freight: challan.freight.toString(),
        startDate: rentDate.toISOString().split('T')[0],
        endDate: returnDate.toISOString().split('T')[0],
        site: challan.site,
      });

      setItems(
        challan.items.map((item) => ({
          itemName: item.itemName,
          quantity: item.quantity.toString(),
          rate: item.rate.toString(),
        }))
      );
      setValidationErrors({});
    }
  }, [open, challan, onClose]);

  const addItem = () => {
    setItems([...items, { itemName: '', quantity: '', rate: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      const newErrors = { ...validationErrors };
      delete newErrors[index];
      setValidationErrors(newErrors);
    }
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);

    if (field === 'itemName' || field === 'quantity') {
      validateItemQuantity(index, newItems[index], newItems);
    }
  };

  const validateItemQuantity = (
    index: number,
    item: { itemName: string; quantity: string; rate: string },
    allItems: Array<{ itemName: string; quantity: string; rate: string }>
  ) => {
    const newErrors = { ...validationErrors };

    if (item.itemName && item.quantity) {
      const inventoryItem = inventory?.find((inv) => inv.name === item.itemName);
      const requestedQty = parseFloat(item.quantity);

      if (inventoryItem && requestedQty > inventoryItem.availableQuantity) {
        newErrors[index] = `Insufficient inventory. Available: ${inventoryItem.availableQuantity.toFixed(2)}`;
      } else {
        delete newErrors[index];
      }
    } else {
      delete newErrors[index];
    }

    setValidationErrors(newErrors);
  };

  const getAvailableQuantity = (itemName: string): number | null => {
    if (!itemName || !inventory) return null;
    const inventoryItem = inventory.find((inv) => inv.name === itemName);
    return inventoryItem ? inventoryItem.availableQuantity : null;
  };

  const calculateRentalDaysFromDates = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return calculateRentalDays(start, end);
  };

  const calculateItemTotal = (item: { quantity: string; rate: string }) => {
    const quantity = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const rentalDays = calculateRentalDaysFromDates();
    return calculateFormItemTotal(quantity, rate, rentalDays);
  };

  const calculateChallanTotal = () => {
    const itemsTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const freight = parseFloat(formData.freight) || 0;
    return itemsTotal + freight;
  };

  const getSelectedItems = () => {
    return items.map((item) => item.itemName).filter((name) => name !== '');
  };

  const hasDuplicateItems = () => {
    const selectedItems = getSelectedItems();
    return selectedItems.length !== new Set(selectedItems).size;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!challan) return;

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    if (hasDuplicateItems()) {
      toast.error('Duplicate items are not allowed in a challan');
      return;
    }

    const challanItems: ChallanItem[] = items
      .filter((item) => item.itemName && item.quantity && item.rate)
      .map((item) => ({
        itemName: item.itemName,
        quantity: parseFloat(item.quantity),
        rate: parseFloat(item.rate),
        rentalDays: calculateRentalDaysFromDates(),
      }));

    if (challanItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const rentDate = dateToNano(new Date(formData.startDate));

      await updateChallan.mutateAsync({
        id: challan.id,
        clientName: formData.clientName,
        venue: formData.venue,
        items: challanItems,
        freight: parseFloat(formData.freight) || 0,
        numberOfDays: calculateRentalDaysFromDates(),
        rentDate,
        site: formData.site,
      });

      toast.success('Challan updated successfully');
      onClose();
    } catch (error) {
      const errorMessage = normalizeError(error);
      toast.error(errorMessage);
    }
  };

  if (!challan) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background opacity-100 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Challan {challan.id}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Select
                  value={formData.clientName}
                  onValueChange={(value) => setFormData({ ...formData, clientName: value })}
                  required
                >
                  <SelectTrigger id="clientName">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <ModalSelectContent>
                    {clientsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading clients...
                      </SelectItem>
                    ) : clients && clients.length > 0 ? (
                      clients.map((client) => (
                        <SelectItem key={client.name} value={client.name}>
                          {client.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-clients" disabled>
                        No clients available
                      </SelectItem>
                    )}
                  </ModalSelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Rent Date (Start) *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Return Date (End) *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const availableQty = getAvailableQuantity(item.itemName);
                  const itemTotal = calculateItemTotal(item);
                  const hasError = validationErrors[index];

                  return (
                    <div key={index} className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4 space-y-1">
                          <Label className="text-xs">Item Name</Label>
                          <Select
                            value={item.itemName}
                            onValueChange={(value) => updateItem(index, 'itemName', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <ModalSelectContent>
                              {inventoryLoading ? (
                                <SelectItem value="loading" disabled>
                                  Loading...
                                </SelectItem>
                              ) : inventory && inventory.length > 0 ? (
                                inventory.map((invItem) => (
                                  <SelectItem key={invItem.name} value={invItem.name}>
                                    {invItem.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-items" disabled>
                                  No items available
                                </SelectItem>
                              )}
                            </ModalSelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Rate</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateItem(index, 'rate', e.target.value)}
                            placeholder="0"
                          />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Days</Label>
                          <Input
                            type="number"
                            value={calculateRentalDaysFromDates()}
                            disabled
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <Label className="text-xs">Total</Label>
                          <div className="h-10 flex items-center text-sm font-medium">
                            ₹{itemTotal.toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {availableQty !== null && item.itemName && (
                        <div className="text-xs text-muted-foreground pl-1">
                          Available: {availableQty.toFixed(2)}
                        </div>
                      )}

                      {hasError && (
                        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                          <AlertCircle className="h-3 w-3" />
                          {hasError}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freight">Freight *</Label>
              <Input
                id="freight"
                type="number"
                step="0.01"
                value={formData.freight}
                onChange={(e) => setFormData({ ...formData, freight: e.target.value })}
                required
              />
            </div>

            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Challan Total:</span>
                <span className="text-lg font-bold">₹{calculateChallanTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateChallan.isPending}>
              {updateChallan.isPending ? 'Updating...' : 'Update Challan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
