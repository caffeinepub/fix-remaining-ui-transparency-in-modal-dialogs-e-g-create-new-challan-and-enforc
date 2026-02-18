import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDiagnosticsReportAsText } from '../../utils/diagnosticsReport';
import { clearDiagnosticLog } from '../../utils/runtimeDiagnostics';

interface DiagnosticsReportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function DiagnosticsReportDialog({ open, onClose }: DiagnosticsReportDialogProps) {
  const report = formatDiagnosticsReportAsText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success('Diagnostics report copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleClear = () => {
    clearDiagnosticLog();
    toast.success('Diagnostics log cleared');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-background opacity-100">
        <DialogHeader>
          <DialogTitle>Diagnostics Report</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Textarea
            value={report}
            readOnly
            className="h-full font-mono text-xs resize-none bg-background"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Log
          </Button>
          <Button onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
