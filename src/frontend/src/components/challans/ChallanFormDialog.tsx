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
import { useCreateChallan, useClients, useInventory } from '../../hooks/useQueries';
import { calculateRentalDays, dateToNano, getTodayNano } from '../../utils/dates';
import { calculateFormItemTotal } from '../../utils/challanTotals';
import { normalizeError } from '../../utils/errors';
import type { ChallanItem } from '../../backend';
import { toast } from 'sonner';

interface ChallanFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChallanFormDialog({ open, onClose }: ChallanFormDialogProps) {
  const createChallan = useCreateChallan();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();

  const [formData, setFormData] = useState({
    id: '',
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
    if (open) {
      setFormData({
        id: '',
        clientName: '',
        venue: '',
        freight: '0',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        site: '',
      });
      setItems([{ itemName: '', quantity: '', rate: '' }]);
      setValidationErrors({});
    }
  }, [open]);

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

  // Check for duplicate items
  const getSelectedItems = () => {
    return items.map((item) => item.itemName).filter((name) => name !== '');
  };

  const hasDuplicateItems = () => {
    const selectedItems = getSelectedItems();
    return selectedItems.length !== new Set(selectedItems).size;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Use the start date (rent date) as the challan's rentDate
      const rentDate = dateToNano(new Date(formData.startDate));
      // Use current time as creationDate
      const creationDate = getTodayNano();
      
      await createChallan.mutateAsync({
        id: formData.id,
        clientName: formData.clientName,
        venue: formData.venue,
        items: challanItems,
        freight: parseFloat(formData.freight) || 0,
        numberOfDays: calculateRentalDaysFromDates(),
        rentDate,
        site: formData.site,
        creationDate,
      });

      toast.success('Challan created successfully');
      onClose();
    } catch (error) {
      const errorMessage = normalizeError(error);
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-background opacity-100">
        <DialogHeader>
          <DialogTitle>Create New Challan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id">Challan ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                />
              </div>

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
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3 bg-muted p-4 rounded-md">
                {items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-start">
                      <div className="space-y-1">
                        <Label className="text-xs">Item Name</Label>
                        <Select
                          value={item.itemName}
                          onValueChange={(value) => {
                            updateItem(index, 'itemName', value);
                            const inventoryItem = inventory?.find((inv) => inv.name === value);
                            if (inventoryItem) {
                              updateItem(index, 'rate', inventoryItem.dailyRate.toString());
                            }
                          }}
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
                              inventory.map((inv) => (
                                <SelectItem key={inv.name} value={inv.name}>
                                  {inv.name}
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

                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Total</Label>
                        <div className="h-10 flex items-center px-3 bg-background rounded-md border text-sm">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-end h-full pb-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {validationErrors[index] && (
                      <div className="flex items-center gap-2 text-destructive text-sm bg-background px-3 py-2 rounded-md">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{validationErrors[index]}</span>
                      </div>
                    )}

                    {item.itemName && (
                      <div className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md">
                        Available: {getAvailableQuantity(item.itemName)?.toFixed(2) ?? 'N/A'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freight">Freight</Label>
              <Input
                id="freight"
                type="number"
                step="0.01"
                value={formData.freight}
                onChange={(e) => setFormData({ ...formData, freight: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rental Days:</span>
                <span className="font-medium">{calculateRentalDaysFromDates()}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span>₹{calculateChallanTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createChallan.isPending}>
              {createChallan.isPending ? 'Creating...' : 'Create Challan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
