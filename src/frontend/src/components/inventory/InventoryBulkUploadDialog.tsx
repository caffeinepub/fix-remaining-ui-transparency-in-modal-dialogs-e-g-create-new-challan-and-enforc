import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Download, Upload, ShieldAlert } from 'lucide-react';
import { useBulkCreateInventoryItems } from '../../hooks/useQueries';
import { useStaffRestrictions } from '../../hooks/useStaffRestrictions';
import { downloadInventoryTemplate } from '../../utils/exportToCSV';
import type { InventoryItem } from '../../backend';

interface InventoryBulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function InventoryBulkUploadDialog({
  open,
  onClose,
}: InventoryBulkUploadDialogProps) {
  const bulkCreate = useBulkCreateInventoryItems();
  const { canBulkUpload, disabledReason } = useStaffRestrictions();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<InventoryItem[] | null>(null);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [uploadResults, setUploadResults] = useState<{
    successCount: number;
    failures: Array<{ id: string; error: string }>;
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
      const lines = text.trim().split('\n');
      const errors: Array<{ row: number; message: string }> = [];
      const items: InventoryItem[] = [];

      if (lines.length === 0) {
        setParseErrors([{ row: 0, message: 'File is empty' }]);
        return;
      }

      // Parse header
      const header = lines[0].split(',').map((h) => h.trim());
      if (!header.includes('Item Name') || !header.includes('Total Quantity') || !header.includes('Daily Rate')) {
        setParseErrors([{ row: 1, message: 'Missing required columns: Item Name, Total Quantity, Daily Rate' }]);
        return;
      }

      const nameIndex = header.indexOf('Item Name');
      const qtyIndex = header.indexOf('Total Quantity');
      const rateIndex = header.indexOf('Daily Rate');

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map((v) => v.trim());
        const rowNumber = i + 1;

        const name = values[nameIndex];
        const qtyStr = values[qtyIndex];
        const rateStr = values[rateIndex];

        if (!name) {
          errors.push({ row: rowNumber, message: 'Missing Item Name' });
          continue;
        }

        const totalQuantity = parseFloat(qtyStr);
        if (isNaN(totalQuantity) || totalQuantity <= 0) {
          errors.push({ row: rowNumber, message: 'Invalid Total Quantity (must be > 0)' });
          continue;
        }

        const dailyRate = parseFloat(rateStr);
        if (isNaN(dailyRate) || dailyRate <= 0) {
          errors.push({ row: rowNumber, message: 'Invalid Daily Rate (must be > 0)' });
          continue;
        }

        items.push({
          name,
          totalQuantity,
          dailyRate,
          issuedQuantity: 0,
          availableQuantity: totalQuantity,
        });
      }

      if (errors.length > 0) {
        setParseErrors(errors);
        setParsedData(null);
      } else {
        setParseErrors([]);
        setParsedData(items);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!parsedData) return;
    if (!canBulkUpload) return;

    try {
      const results = await bulkCreate.mutateAsync(parsedData);
      const successCount = results.filter((r) => r.success).length;
      const failures = results
        .filter((r) => !r.success)
        .map((r) => ({ id: r.name, error: r.error || 'Unknown error' }));

      setUploadResults({ successCount, failures });
    } catch (error) {
      console.error('Bulk upload error:', error);
      setUploadResults({
        successCount: 0,
        failures: [{ id: 'all', error: String(error) }],
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
          <DialogTitle>Bulk Upload Inventory</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 space-y-4">
          {!canBulkUpload ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Access Restricted</AlertTitle>
              <AlertDescription>
                {disabledReason || 'You do not have permission to perform bulk uploads.'}
              </AlertDescription>
            </Alert>
          ) : !uploadResults ? (
            <>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
                  <h4 className="font-semibold text-blue-900 text-sm">CSV Format</h4>
                  <p className="text-xs text-blue-800">
                    Item Name, Total Quantity, Daily Rate
                  </p>
                  <p className="text-xs text-blue-800 mt-2">
                    This will create new records in bulk. Duplicate item names will be rejected.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={downloadInventoryTemplate}
                    className="mt-2"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
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
                      {parsedData.length} Valid Item{parsedData.length !== 1 ? 's' : ''}
                    </AlertTitle>
                    <AlertDescription className="text-green-700">
                      Ready to upload.
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
              {uploadResults.successCount > 0 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">
                    Successfully Created {uploadResults.successCount} Item{uploadResults.successCount !== 1 ? 's' : ''}
                  </AlertTitle>
                </Alert>
              )}

              {uploadResults.failures.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{uploadResults.failures.length} Failed</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      <ul className="space-y-1 text-sm break-words">
                        {uploadResults.failures.map((fail, idx) => (
                          <li key={idx}>
                            {fail.id}: {fail.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
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
                <Button onClick={handleImport} disabled={bulkCreate.isPending}>
                  <Upload className="mr-2 h-4 w-4" />
                  {bulkCreate.isPending ? 'Uploading...' : `Upload ${parsedData.length} Item${parsedData.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Upload More
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
