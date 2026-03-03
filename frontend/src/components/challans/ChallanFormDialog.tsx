import React, { useState, useEffect } from 'react';
import { useCreateChallan, useClients, useInventory } from '../../hooks/useQueries';
import { dateToNano, toDateInputValue } from '../../utils/dates';
import { calcChallanTotal } from '../../utils/challanTotals';
import type { ChallanItem } from '../../backend';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectItem,
} from '@/components/ui/select';
import ModalSelectContent from '../common/ModalSelectContent';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SITES = ['Udaipur', 'Jaipur', 'Jodhpur', 'Other'];

function generateId() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CH${y}${m}${d}${rand}`;
}

export default function ChallanFormDialog({ open, onOpenChange }: Props) {
  const createChallan = useCreateChallan();
  const { data: clients = [] } = useClients();
  const { data: inventory = [] } = useInventory();

  const [id, setId] = useState('');
  const [clientName, setClientName] = useState('');
  const [newClient, setNewClient] = useState('');
  const [useNewClient, setUseNewClient] = useState(false);
  const [venue, setVenue] = useState('');
  const [site, setSite] = useState('Udaipur');
  const [rentDate, setRentDate] = useState(toDateInputValue(new Date()));
  const [numberOfDays, setNumberOfDays] = useState('1');
  const [freight, setFreight] = useState('0');
  const [items, setItems] = useState<ChallanItem[]>([{ itemName: '', quantity: 1, rate: 0, rentalDays: 1 }]);
  const [itemErrors, setItemErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setId(generateId());
      setClientName('');
      setNewClient('');
      setUseNewClient(false);
      setVenue('');
      setSite('Udaipur');
      setRentDate(toDateInputValue(new Date()));
      setNumberOfDays('1');
      setFreight('0');
      setItems([{ itemName: '', quantity: 1, rate: 0, rentalDays: 1 }]);
      setItemErrors([]);
    }
  }, [open]);

  const addItem = () => setItems(prev => [...prev, { itemName: '', quantity: 1, rate: 0, rentalDays: 1 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ChallanItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const validateItems = () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (!item.itemName.trim()) { errs[i] = 'Item name required'; return; }
      if (seen.has(item.itemName.toLowerCase())) { errs[i] = 'Duplicate item'; return; }
      seen.add(item.itemName.toLowerCase());
      const inv = inventory.find(inv => inv.name.toLowerCase() === item.itemName.toLowerCase());
      if (inv && item.quantity > inv.availableQuantity) {
        errs[i] = `Only ${inv.availableQuantity} available`;
      }
    });
    setItemErrors(errs);
    return errs.every(e => !e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalClient = useNewClient ? newClient.trim() : clientName;
    if (!finalClient) { toast.error('Client name is required'); return; }
    if (!validateItems()) return;

    const rentDateObj = new Date(rentDate);
    const days = parseFloat(numberOfDays) || 1;
    const finalItems = items.filter(i => i.itemName.trim()).map(i => ({
      ...i,
      rentalDays: days,
    }));

    createChallan.mutate({
      id,
      clientName: finalClient,
      venue,
      items: finalItems,
      freight: parseFloat(freight) || 0,
      numberOfDays: days,
      rentDate: dateToNano(rentDateObj),
      site,
      creationDate: dateToNano(new Date()),
    }, {
      onSuccess: () => { toast.success('Challan created'); onOpenChange(false); },
      onError: (e) => toast.error(`Failed: ${e.message}`),
    });
  };

  const total = calcChallanTotal(
    items.filter(i => i.itemName.trim()).map(i => ({ ...i, rentalDays: parseFloat(numberOfDays) || 1 })),
    parseFloat(freight) || 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background opacity-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Challan</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Challan ID</Label>
              <Input value={id} onChange={e => setId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <ModalSelectContent>
                  {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </ModalSelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Client</Label>
              <button type="button" className="text-xs text-primary underline" onClick={() => setUseNewClient(!useNewClient)}>
                {useNewClient ? 'Select existing' : 'Add new client'}
              </button>
            </div>
            {useNewClient ? (
              <Input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="New client name" />
            ) : (
              <Select value={clientName} onValueChange={setClientName}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <ModalSelectContent>
                  {clients.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </ModalSelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Event venue" />
            </div>
            <div className="space-y-1.5">
              <Label>Rent Date</Label>
              <Input type="date" value={rentDate} onChange={e => setRentDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Number of Days</Label>
              <Input type="number" min="1" step="0.5" value={numberOfDays} onChange={e => setNumberOfDays(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Freight (₹)</Label>
              <Input type="number" min="0" step="0.01" value={freight} onChange={e => setFreight(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={e => updateItem(idx, 'itemName', e.target.value)}
                        list={`inv-list-${idx}`}
                      />
                      <datalist id={`inv-list-${idx}`}>
                        {inventory.map(i => <option key={i.name} value={i.name} />)}
                      </datalist>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number" min="0" step="0.01" placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number" min="0" step="0.01" placeholder="Rate/day"
                        value={item.rate}
                        onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {itemErrors[idx] && <p className="text-xs text-destructive">{itemErrors[idx]}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold">₹{total.toLocaleString('en-IN')}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createChallan.isPending}>
              {createChallan.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Challan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
