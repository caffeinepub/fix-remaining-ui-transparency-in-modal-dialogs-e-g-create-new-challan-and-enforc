import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Loader2, Upload } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { InventoryItem } from "../../backend";
import { useBulkCreateInventoryItems } from "../../hooks/useQueries";
import { parseCSV } from "../../utils/csv";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingItems: InventoryItem[];
}

function downloadTemplate() {
  const csv =
    "Name,Total Quantity,Daily Rate\nTent 20x30,10,500\nChair,100,20\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryBulkUploadDialog({
  open,
  onOpenChange,
  existingItems,
}: Props) {
  const bulkCreate = useBulkCreateInventoryItems();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<InventoryItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      if (rows.length === 0) {
        setErrors(["File is empty or has no data rows"]);
        setPreview([]);
        return;
      }

      const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
      const nameIdx = normalizedHeaders.indexOf("name");
      const qtyIdx = normalizedHeaders.findIndex(
        (h) => h.includes("quantity") || h === "qty",
      );
      const rateIdx = normalizedHeaders.findIndex(
        (h) => h.includes("rate") || h.includes("price"),
      );

      if (nameIdx < 0 || qtyIdx < 0 || rateIdx < 0) {
        setErrors([
          "Missing required columns: Name, Total Quantity, Daily Rate",
        ]);
        setPreview([]);
        return;
      }

      const errs: string[] = [];
      const items: InventoryItem[] = [];
      const existingNames = new Set(
        existingItems.map((i) => i.name.toLowerCase()),
      );
      const seenNames = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.every((c) => !c.trim())) continue;
        const name = row[nameIdx]?.trim();
        const qty = Number.parseFloat(row[qtyIdx]);
        const rate = Number.parseFloat(row[rateIdx]);
        const rowNum = i + 2; // +2 because header is row 1, data starts at row 2

        if (!name) {
          errs.push(`Row ${rowNum}: Name is required`);
          continue;
        }
        if (existingNames.has(name.toLowerCase())) {
          errs.push(`Row ${rowNum}: "${name}" already exists`);
          continue;
        }
        if (seenNames.has(name.toLowerCase())) {
          errs.push(`Row ${rowNum}: Duplicate name "${name}"`);
          continue;
        }
        if (Number.isNaN(qty) || qty <= 0) {
          errs.push(`Row ${rowNum}: Invalid quantity`);
          continue;
        }
        if (Number.isNaN(rate) || rate <= 0) {
          errs.push(`Row ${rowNum}: Invalid rate`);
          continue;
        }

        seenNames.add(name.toLowerCase());
        items.push({
          name,
          totalQuantity: qty,
          dailyRate: rate,
          issuedQuantity: 0,
          availableQuantity: qty,
        });
      }

      setErrors(errs);
      setPreview(items);
    };
    reader.readAsText(file);
  };

  const handleUpload = () => {
    if (preview.length === 0) return;
    bulkCreate.mutate(preview, {
      onSuccess: (results) => {
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        toast.success(
          `Uploaded ${succeeded} items${failed > 0 ? `, ${failed} failed` : ""}`,
        );
        onOpenChange(false);
        setPreview([]);
        setErrors([]);
        setFileName("");
      },
      onError: (e) => toast.error(`Upload failed: ${e.message}`),
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setPreview([]);
      setErrors([]);
      setFileName("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background opacity-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Inventory</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
          <button
            type="button"
            className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName || "Click to select CSV file"}
            </p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFile}
          />

          {errors.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
              {errors.map((e, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static error list after parse
                <p key={i} className="text-xs text-destructive">
                  {e}
                </p>
              ))}
            </div>
          )}

          {preview.length > 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {preview.length} items ready to upload
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={preview.length === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Upload {preview.length > 0 ? `(${preview.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
