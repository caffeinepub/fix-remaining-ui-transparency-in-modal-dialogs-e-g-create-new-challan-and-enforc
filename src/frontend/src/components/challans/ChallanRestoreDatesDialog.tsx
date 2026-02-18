import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useRestoreChallanDates } from '../../hooks/useQueries';
import { useStaffRestrictions } from '../../hooks/useStaffRestrictions';
import { parseAndValidateChallanRestoreCSV } from '../../utils/challanRestoreImport';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Challan } from '../../backend';

interface ChallanRestoreDatesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChallanRestoreDatesDialog({
  open,
  onClose,
}: ChallanRestoreDatesDialogProps) {
  const updateDates = useRestoreChallanDates();
  const { canBulkUpload, disabledReason } = useStaffRestrictions();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Challan[] | null>(null);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [uploadResults, setUploadResults] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsedData(null);
    setParseErrors([]);
    setUploadResults(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseAndValidateChallanRestoreCSV(text);

      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        setParsedData(null);
      } else {
        setParseErrors([]);
        setParsedData(result.validChallans);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleRestore = async () => {
    if (!parsedData) return;
    if (!canBulkUpload) return;

    try {
      await updateDates.mutateAsync(parsedData);
      setUploadResults({ success: true });
    } catch (error) {
      console.error('Restore dates error:', error);
      setUploadResults({
        success: false,
        error: String(error),
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setParseErrors([]);
    setUploadResults(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-background opacity-100 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Restore Challan Dates</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 space-y-4">
          {!canBulkUpload ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Access Restricted</AlertTitle>
              <AlertDescription>
                {disabledReason || 'You do not have permission to perform this action.'}
              </AlertDescription>
            </Alert>
          ) : !uploadResults ? (
            <>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900 text-sm">Restore Dates from Original CSV</h4>
                  <p className="text-xs text-blue-800">
                    Upload the original challan CSV file to restore rent and return dates.
                  </p>
                  <p className="text-xs text-blue-800 mt-2">
                    Supports both legacy format (Start Date/End Date) and new format (Rent Date/Return Date).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">Select CSV File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    disabled={!canBulkUpload}
                  />
                </div>

                {parsedData && parsedData.length > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">
                      {parsedData.length} Challan{parsedData.length !== 1 ? 's' : ''} Ready to Restore
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      Dates will be updated for existing challans.
                    </AlertDescription>
                  </Alert>
                )}

                {parseErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{parseErrors.length} Error{parseErrors.length !== 1 ? 's' : ''}</AlertTitle>
                    <AlertDescription>
                      <ScrollArea className="h-48 mt-2">
                        <ul className="space-y-1 text-sm">
                          {parseErrors.map((err, idx) => (
                            <li key={idx} className="break-words">
                              Row {err.row}: {err.message}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {uploadResults.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Dates Restored Successfully
                  </AlertTitle>
                  <AlertDescription className="text-green-700">
                    Challan dates have been updated.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Restore Failed</AlertTitle>
                  <AlertDescription>
                    {uploadResults.error || 'Unknown error occurred'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!uploadResults ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {parsedData && parsedData.length > 0 && canBulkUpload && (
                <Button onClick={handleRestore} disabled={updateDates.isPending}>
                  <Upload className="mr-2 h-4 w-4" />
                  {updateDates.isPending ? 'Restoring...' : `Restore ${parsedData.length} Challan${parsedData.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Restore More
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
