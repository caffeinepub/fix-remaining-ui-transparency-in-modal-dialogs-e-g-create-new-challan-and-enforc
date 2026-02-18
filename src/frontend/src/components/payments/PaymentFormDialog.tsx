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
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModalSelectContent } from '@/components/common/ModalSelectContent';
import { useAddPayment, useClients } from '../../hooks/useQueries';
import { dateToNano } from '../../utils/dates';
import { toast } from 'sonner';

interface PaymentFormDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PaymentFormDialog({ open, onClose }: PaymentFormDialogProps) {
  const addPayment = useAddPayment();
  const { data: clients, isLoading: clientsLoading } = useClients();

  const [formData, setFormData] = useState({
    id: '',
    date: '',
    client: '',
    mode: '',
    amount: '',
    referenceNumber: '',
    site: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        id: '',
        date: new Date().toISOString().split('T')[0],
        client: '',
        mode: '',
        amount: '',
        referenceNumber: '',
        site: '',
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addPayment.mutateAsync({
        id: formData.id,
        date: dateToNano(new Date(formData.date)),
        client: formData.client,
        mode: formData.mode,
        amount: parseFloat(formData.amount),
        referenceNumber: formData.referenceNumber,
        site: formData.site,
      });

      toast.success('Payment added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background opacity-100 max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">Payment ID *</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.client}
              onValueChange={(value) => setFormData({ ...formData, client: value })}
              required
            >
              <SelectTrigger id="client">
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
            <Label htmlFor="mode">Payment Mode *</Label>
            <Select
              value={formData.mode}
              onValueChange={(value) => setFormData({ ...formData, mode: value })}
              required
            >
              <SelectTrigger id="mode">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <ModalSelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </ModalSelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={formData.referenceNumber}
              onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              placeholder="Optional"
            />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending ? 'Adding...' : 'Add Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
