import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAddPayment, useClients } from "../../hooks/useQueries";
import { dateToNano, toDateInputValue } from "../../utils/dates";
import ModalSelectContent from "../common/ModalSelectContent";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAYMENT_MODES = [
  "CASH",
  "ONLINE",
  "CHEQUE",
  "UPI",
  "BANK TRANSFER",
  "OTHER",
];

export default function PaymentFormDialog({ open, onClose }: Props) {
  const addPayment = useAddPayment();
  const { data: clients = [] } = useClients();

  const [id, setId] = useState("");
  const [date, setDate] = useState("");
  const [client, setClient] = useState("");
  const [mode, setMode] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [site, setSite] = useState("");

  useEffect(() => {
    if (open) {
      const now = new Date();
      setId(
        `PAY${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${Math.floor(Math.random() * 9000) + 1000}`,
      );
      setDate(toDateInputValue(now));
      setClient("");
      setMode("");
      setAmount("");
      setReferenceNumber("");
      setSite("");
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) {
      toast.error("Please select a client");
      return;
    }
    if (!mode) {
      toast.error("Please select a payment mode");
      return;
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    addPayment.mutate(
      {
        id,
        date: dateToNano(new Date(date)),
        client,
        mode,
        amount: Number.parseFloat(amount),
        referenceNumber,
        site,
      },
      {
        onSuccess: () => {
          toast.success("Payment added");
          onClose();
        },
        onError: (e) => toast.error(`Failed: ${e.message}`),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="bg-background opacity-100 max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Payment ID</Label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={client} onValueChange={setClient}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <ModalSelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </ModalSelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <ModalSelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </ModalSelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Reference Number</Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {addPayment.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Add Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
