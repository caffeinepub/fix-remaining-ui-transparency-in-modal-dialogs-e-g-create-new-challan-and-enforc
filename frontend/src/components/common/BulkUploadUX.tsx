import { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Download, Upload, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepsProps {
  children: ReactNode;
  currentStep?: string;
}

export function BulkUploadSteps({ children }: StepsProps) {
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
      {children}
    </div>
  );
}

interface StepsTitleProps {
  children: ReactNode;
}

export function BulkUploadStepsTitle({ children }: StepsTitleProps) {
  return <h4 className="font-semibold text-blue-900 text-sm">{children}</h4>;
}

interface StepsDescriptionProps {
  children: ReactNode;
}

export function BulkUploadStepsDescription({ children }: StepsDescriptionProps) {
  return <div className="text-xs text-blue-800 space-y-1">{children}</div>;
}

interface HelperTextProps {
  children: ReactNode;
}

export function BulkUploadHelperText({ children }: HelperTextProps) {
  return <p className="text-sm text-gray-600">{children}</p>;
}

interface TemplateDownloadButtonProps {
  onDownload: () => void;
}

export function BulkUploadTemplateDownloadButton({ onDownload }: TemplateDownloadButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onDownload}
      className="mt-2"
    >
      <Download className="mr-2 h-4 w-4" />
      Download Template
    </Button>
  );
}

interface ValidationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function BulkUploadValidationButton({ onClick, disabled, isProcessing }: ValidationButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-blue-600 hover:bg-blue-700"
    >
      <Upload className="mr-2 h-4 w-4" />
      {isProcessing ? 'Validating...' : 'Validate File'}
    </Button>
  );
}

interface PreviewSectionProps {
  totalRows?: number;
  validCount: number;
  errorCount?: number;
  errors: Array<{ rowNumber: number; error: string; id?: string }>;
  onUpload?: () => void;
  isProcessing?: boolean;
  itemLabel?: string;
}

export function BulkUploadPreviewSection({
  validCount,
  errors,
  onUpload,
  isProcessing,
  itemLabel = 'item',
}: PreviewSectionProps) {
  const itemLabelPlural = itemLabel + 's';
  
  return (
    <div className="space-y-4">
      {validCount > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            {validCount} Valid {validCount === 1 ? itemLabel : itemLabelPlural}
          </AlertTitle>
          <AlertDescription className="text-green-700">
            These {itemLabelPlural} are ready to be uploaded.
          </AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errors.length} Error{errors.length !== 1 ? 's' : ''} Found</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-48 mt-2">
              <ul className="space-y-1 text-sm">
                {errors.map((err, idx) => (
                  <li key={idx} className="break-words">
                    {err.id && <span className="font-semibold">{err.id} </span>}
                    Row {err.rowNumber}: {err.error}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </AlertDescription>
        </Alert>
      )}

      {validCount > 0 && onUpload && (
        <Button
          onClick={onUpload}
          disabled={isProcessing}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isProcessing ? 'Uploading...' : `Upload ${validCount} ${validCount === 1 ? itemLabel : itemLabelPlural}`}
        </Button>
      )}
    </div>
  );
}

interface ResultsSummaryProps {
  successCount: number;
  failedCount: number;
}

export function BulkUploadResultsSummary({ successCount, failedCount }: ResultsSummaryProps) {
  return (
    <div className="space-y-4">
      {successCount > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            Successfully Restored {successCount} Challan{successCount !== 1 ? 's' : ''}
          </AlertTitle>
        </Alert>
      )}

      {failedCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{failedCount} Failed</AlertTitle>
        </Alert>
      )}
    </div>
  );
}

interface ResultsSectionProps {
  successCount: number;
  failures: Array<{ id: string; error: string }>;
  itemLabel?: string;
}

export function BulkUploadResultsSection({ successCount, failures, itemLabel = 'item' }: ResultsSectionProps) {
  const itemLabelPlural = itemLabel + 's';
  
  return (
    <div className="space-y-4">
      {successCount > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            Successfully Created {successCount} {successCount === 1 ? itemLabel : itemLabelPlural}
          </AlertTitle>
        </Alert>
      )}

      {failures.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{failures.length} {failures.length === 1 ? itemLabel : itemLabelPlural} Failed</AlertTitle>
          <AlertDescription>
            <ScrollArea className="h-32 mt-2">
              <ul className="space-y-1 text-sm break-words">
                {failures.map((fail, idx) => (
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
  );
}

interface WarningProps {
  children: ReactNode;
}

export function BulkUploadWarning({ children }: WarningProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Important</AlertTitle>
      <AlertDescription className="text-amber-800 text-sm">
        {children}
      </AlertDescription>
    </Alert>
  );
}

interface ErrorDisplayProps {
  error: string;
}

export function BulkUploadErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Upload Failed</AlertTitle>
      <AlertDescription className="break-words">
        {error}
      </AlertDescription>
    </Alert>
  );
}
