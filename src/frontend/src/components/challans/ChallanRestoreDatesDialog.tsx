import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Challan } from "../../backend";
import { useRestoreChallanDates } from "../../hooks/useQueries";
import { useStaffRestrictions } from "../../hooks/useStaffRestrictions";
import { parseAndValidateChallanRestoreCSV } from "../../utils/challanRestoreImport";

interface ChallanRestoreDatesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChallanRestoreDatesDialog({
  open,
  onClose,
}: ChallanRestoreDatesDialogProps) {
  const updateDates = useRestoreChallanDates();
  const { canBulkUpload } = useStaffRestrictions();
  const [parsedData, setParsedData] = useState<Challan[] | null>(null);
  const [parseErrors, setParseErrors] = useState<
    Array<{ row: number; message: string }>
  >([]);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsedData(null);
    setParseErrors([]);
    setDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseAndValidateChallanRestoreCSV(text);
      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setParsedData(null);
      } else {
        setParseErrors([]);
        setParsedData(result.validChallans);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!parsedData || !canBulkUpload) return;
    try {
      await updateDates.mutateAsync(parsedData);
      setDone(true);
    } catch (err: any) {
      setParseErrors([{ row: 0, message: err?.message || "Restore failed" }]);
    }
  };

  const handleClose = () => {
    setParsedData(null);
    setParseErrors([]);
    setDone(false);
    setFileName("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="bg-background opacity-100 max-w-lg">
        <DialogHeader>
          <DialogTitle>Restore Challan Dates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!canBulkUpload ? (
            <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              Only admins can restore challan dates.
            </div>
          ) : done ? (
            <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="text-sm">
                Dates restored successfully for {parsedData?.length || 0}{" "}
                challans.
              </span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with Challan ID, Rent Date, and Return Date
                columns to restore dates.
              </p>

              <button
                type="button"
                className="w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() =>
                  document.getElementById("restore-file-input")?.click()
                }
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {fileName || "Click to select CSV file"}
                </p>
              </button>
              <input
                id="restore-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              {parseErrors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                  {parseErrors.map((e, i) => (
                    <p
                      // biome-ignore lint/suspicious/noArrayIndexKey: error list is static after parse
                      key={i}
                      className="text-xs text-destructive flex items-start gap-1"
                    >
                      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                      {e.row > 0 ? `Row ${e.row}: ` : ""}
                      {e.message}
                    </p>
                  ))}
                </div>
              )}

              {parsedData && parsedData.length > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {parsedData.length} challans ready to restore
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && canBulkUpload && (
            <Button
              onClick={handleRestore}
              disabled={
                !parsedData || parsedData.length === 0 || updateDates.isPending
              }
            >
              {updateDates.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Restore {parsedData ? `(${parsedData.length})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
