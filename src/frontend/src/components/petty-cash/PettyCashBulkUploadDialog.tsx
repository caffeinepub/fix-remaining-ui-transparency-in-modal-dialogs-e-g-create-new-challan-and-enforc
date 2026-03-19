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
import type { PettyCash, PettyCashWithAttachments } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useBulkAddPettyCash } from "../../hooks/useQueries";
import { downloadPettyCashTemplate } from "../../utils/exportToCSV";
import { parseAndValidatePettyCashCSV } from "../../utils/pettyCashImport";

interface PettyCashBulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  existingRecords: PettyCashWithAttachments[];
}

interface UploadResult {
  date: bigint;
  success: boolean;
  error?: string;
}

export function PettyCashBulkUploadDialog({
  open,
  onClose,
  existingRecords,
}: PettyCashBulkUploadDialogProps) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isActorReady = !!actor && !isFetching;
  const isAuthenticated = !!identity;

  const [file, setFile] = useState<File | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<PettyCash[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkAddMutation = useBulkAddPettyCash();

  const handleClose = () => {
    setFile(null);
    setPreviewCount(0);
    setParseErrors([]);
    setUploadResults([]);
    setIsUploading(false);
    setUploadDone(false);
    setParsedRecords([]);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseErrors([]);
    setParsedRecords([]);
    setPreviewCount(0);
    setUploadResults([]);
    setUploadDone(false);

    const existingPettyCash = existingRecords.map((r) => r.pettyCash);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseAndValidatePettyCashCSV(text, existingPettyCash);
      if (result.errors.length > 0) {
        setParseErrors(
          result.errors.map((e) =>
            e.rowNumber > 0 ? `Row ${e.rowNumber}: ${e.error}` : e.error,
          ),
        );
      }
      setParsedRecords(result.valid);
      setPreviewCount(result.valid.length);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!isAuthenticated) {
      setParseErrors(["Please sign in to upload petty cash records."]);
      return;
    }
    if (!isActorReady) {
      setParseErrors([
        "Backend is connecting. Please wait a moment and try again.",
      ]);
      return;
    }
    if (parsedRecords.length === 0) return;

    setIsUploading(true);
    try {
      const results = await bulkAddMutation.mutateAsync(parsedRecords);
      setUploadResults(
        results.map((r) => ({
          date: r.date,
          success: r.success,
          error: r.error,
        })),
      );
      setUploadDone(true);
    } catch (err: any) {
      setParseErrors([err?.message || "Upload failed"]);
    } finally {
      setIsUploading(false);
    }
  };

  const successCount = uploadResults.filter((r) => r.success).length;
  const failCount = uploadResults.filter((r) => !r.success).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="bg-background opacity-100 sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Petty Cash</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadPettyCashTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {!uploadDone && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Select CSV File"}
              </Button>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-3 space-y-1">
              {parseErrors.map((e, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static error list after parse
                <div key={i} className="break-words">
                  {e}
                </div>
              ))}
            </div>
          )}

          {previewCount > 0 && !uploadDone && (
            <p className="text-sm text-muted-foreground">
              {previewCount} records ready to upload
            </p>
          )}

          {uploadDone && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Upload complete: {successCount} succeeded, {failCount} failed
              </div>
              {uploadResults.filter((r) => !r.success).length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResults
                        .filter((r) => !r.success)
                        .map((r) => (
                          <tr key={String(r.date)} className="border-t">
                            <td className="p-2">{String(r.date)}</td>
                            <td className="p-2 text-destructive break-words">
                              {r.error}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!uploadDone ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  parsedRecords.length === 0 ||
                  !isActorReady ||
                  !isAuthenticated
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${previewCount} Records`
                )}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
