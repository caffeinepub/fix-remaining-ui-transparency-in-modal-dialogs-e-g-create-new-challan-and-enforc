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
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Challan, ChallanItem } from "../../backend";
import {
  useClients,
  useInventory,
  useUpdateChallan,
} from "../../hooks/useQueries";
import { calcChallanTotal } from "../../utils/challanTotals";
import { dateToNano, nanoToDate, toDateInputValue } from "../../utils/dates";
import ModalSelectContent from "../common/ModalSelectContent";

interface ChallanEditDialogProps {
  open: boolean;
  onClose: () => void;
  challan: Challan;
}

const SITES = ["Udaipur", "Jaipur", "Jodhpur", "Other"];

export default function ChallanEditDialog({
  open,
  onClose,
  challan,
}: ChallanEditDialogProps) {
  const updateChallan = useUpdateChallan();
  const { data: clients = [] } = useClients();
  const { data: inventory = [] } = useInventory();

  const [clientName, setClientName] = useState("");
  const [venue, setVenue] = useState("");
  const [site, setSite] = useState("Udaipur");
  const [rentDate, setRentDate] = useState("");
  const [numberOfDays, setNumberOfDays] = useState("1");
  const [freight, setFreight] = useState("0");
  const [items, setItems] = useState<ChallanItem[]>([]);
  const [itemErrors, setItemErrors] = useState<string[]>([]);

  useEffect(() => {
    if (open && challan) {
      setClientName(challan.clientName);
      setVenue(challan.venue);
      setSite(challan.site || "Udaipur");
      setRentDate(toDateInputValue(nanoToDate(challan.rentDate)));
      setNumberOfDays(String(challan.numberOfDays));
      setFreight(String(challan.freight));
      setItems(
        challan.items.length > 0
          ? [...challan.items]
          : [{ itemName: "", quantity: 1, rate: 0, rentalDays: 1 }],
      );
      setItemErrors([]);
    }
  }, [open, challan]);

  if (challan.returned) {
    return (
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <DialogContent className="bg-background opacity-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4" /> Challan Locked
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This challan has been marked as returned and cannot be edited.
          </p>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { itemName: "", quantity: 1, rate: 0, rentalDays: 1 },
    ]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (
    idx: number,
    field: keyof ChallanItem,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  };

  const validateItems = () => {
    const errs: string[] = [];
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (!item.itemName.trim()) {
        errs[i] = "Item name required";
        return;
      }
      if (seen.has(item.itemName.toLowerCase())) {
        errs[i] = "Duplicate item";
        return;
      }
      seen.add(item.itemName.toLowerCase());
      const inv = inventory.find(
        (inv) => inv.name.toLowerCase() === item.itemName.toLowerCase(),
      );
      const originalQty =
        challan.items.find((ci) => ci.itemName === item.itemName)?.quantity ||
        0;
      if (inv && item.quantity > inv.availableQuantity + originalQty) {
        errs[i] = `Only ${inv.availableQuantity + originalQty} available`;
      }
    });
    setItemErrors(errs);
    return errs.every((e) => !e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateItems()) return;

    const days = Number.parseFloat(numberOfDays) || 1;
    const finalItems = items
      .filter((i) => i.itemName.trim())
      .map((i) => ({
        ...i,
        rentalDays: days,
      }));

    updateChallan.mutate(
      {
        id: challan.id,
        clientName,
        venue,
        items: finalItems,
        freight: Number.parseFloat(freight) || 0,
        numberOfDays: days,
        rentDate: dateToNano(new Date(rentDate)),
        site,
      },
      {
        onSuccess: () => {
          toast.success("Challan updated");
          onClose();
        },
        onError: (e) => toast.error(`Failed: ${e.message}`),
      },
    );
  };

  const total = calcChallanTotal(
    items
      .filter((i) => i.itemName.trim())
      .map((i) => ({ ...i, rentalDays: Number.parseFloat(numberOfDays) || 1 })),
    Number.parseFloat(freight) || 0,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="bg-background opacity-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Challan — {challan.id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client</Label>
            <Select value={clientName} onValueChange={setClientName}>
              <SelectTrigger>
                <SelectValue />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select value={site} onValueChange={setSite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <ModalSelectContent>
                  {SITES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </ModalSelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rent Date</Label>
              <Input
                type="date"
                value={rentDate}
                onChange={(e) => setRentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Number of Days</Label>
              <Input
                type="number"
                min="1"
                step="0.5"
                value={numberOfDays}
                onChange={(e) => setNumberOfDays(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Freight (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: items are positional in a dynamic form list
                <div key={idx} className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Input
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(e) =>
                          updateItem(idx, "itemName", e.target.value)
                        }
                        list={`inv-edit-${idx}`}
                      />
                      <datalist id={`inv-edit-${idx}`}>
                        {inventory.map((i) => (
                          <option key={i.name} value={i.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "quantity",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate/day"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "rate",
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(idx)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {itemErrors[idx] && (
                    <p className="text-xs text-destructive">
                      {itemErrors[idx]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold">
              ₹{total.toLocaleString("en-IN")}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateChallan.isPending}>
              {updateChallan.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Update Challan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
