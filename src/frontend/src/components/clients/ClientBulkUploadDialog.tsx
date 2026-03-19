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
import type { Client } from "../../backend";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useBulkCreateClients } from "../../hooks/useQueries";
import { parseAndValidateClientCSV } from "../../utils/clientImport";
import { downloadClientTemplate } from "../../utils/exportToCSV";

interface ClientBulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  existingClients: Client[];
}

interface UploadResult {
  name: string;
  success: boolean;
  error?: string;
}

export function ClientBulkUploadDialog({
  open,
  onClose,
  existingClients,
}: ClientBulkUploadDialogProps) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const isActorReady = !!actor && !isFetching;
  const isAuthenticated = !!identity;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Client[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkCreateMutation = useBulkCreateClients();

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setParseErrors([]);
    setUploadResults([]);
    setIsUploading(false);
    setUploadDone(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseErrors([]);
    setPreview([]);
    setUploadResults([]);
    setUploadDone(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseAndValidateClientCSV(text, existingClients);
      if (result.errors.length > 0) {
        setParseErrors(
          result.errors.map((e) =>
            e.rowNumber > 0 ? `Row ${e.rowNumber}: ${e.error}` : e.error,
          ),
        );
      }
      setPreview(result.valid);
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!isAuthenticated) {
      setParseErrors(["Please sign in to upload clients."]);
      return;
    }
    if (!isActorReady) {
      setParseErrors([
        "Backend is connecting. Please wait a moment and try again.",
      ]);
      return;
    }
    if (preview.length === 0) return;

    setIsUploading(true);
    try {
      const results = await bulkCreateMutation.mutateAsync(preview);
      setUploadResults(
        results.map((r) => ({
          name: r.name,
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
          <DialogTitle>Bulk Upload Clients</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadClientTemplate}
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
                // biome-ignore lint/suspicious/noArrayIndexKey: error list is static after parse
                <div key={i} className="break-words">
                  {e}
                </div>
              ))}
            </div>
          )}

          {preview.length > 0 && !uploadDone && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {preview.length} clients ready to upload
              </p>
              <div className="max-h-48 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Client Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c) => (
                      <tr key={c.name} className="border-t">
                        <td className="p-2">{c.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                        <th className="text-left p-2">Client Name</th>
                        <th className="text-left p-2">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadResults
                        .filter((r) => !r.success)
                        .map((r) => (
                          <tr key={r.name} className="border-t">
                            <td className="p-2">{r.name}</td>
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
                  preview.length === 0 ||
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
                  `Upload ${preview.length} Clients`
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
