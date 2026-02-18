import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetPettyCashAttachments,
  useAddPettyCashAttachment,
  useRemovePettyCashAttachment,
} from '../../hooks/useQueries';
import { ExternalBlob } from '../../backend';

interface PettyCashAttachmentsSectionProps {
  date: bigint;
}

interface LocalAttachment {
  id: string;
  file: File;
  uploading: boolean;
}

export default function PettyCashAttachmentsSection({ date }: PettyCashAttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localAttachments, setLocalAttachments] = useState<LocalAttachment[]>([]);

  const { data: attachments = [], isLoading } = useGetPettyCashAttachments(date);
  const addAttachment = useAddPettyCashAttachment();
  const removeAttachment = useRemovePettyCashAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only PNG, JPG, JPEG, and PDF are allowed.`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      const localId = `local-${Date.now()}-${Math.random()}`;
      setLocalAttachments((prev) => [...prev, { id: localId, file, uploading: true }]);

      try {
        // Read file as bytes
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Create ExternalBlob and upload
        const blob = ExternalBlob.fromBytes(bytes);

        await addAttachment.mutateAsync({
          date,
          attachment: {
            id: localId,
            blob,
          },
        });

        // Remove from local state after successful upload
        setLocalAttachments((prev) => prev.filter((a) => a.id !== localId));
        toast.success(`Uploaded: ${file.name}`);
      } catch (error: any) {
        setLocalAttachments((prev) => prev.filter((a) => a.id !== localId));
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (attachmentId: string) => {
    try {
      await removeAttachment.mutateAsync({ date, attachmentId });
      toast.success('Attachment removed');
    } catch (error: any) {
      toast.error(`Failed to remove attachment: ${error.message}`);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label>Attachments (Images & PDFs)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <p className="text-xs text-gray-500">
        Upload images (PNG, JPG) or PDFs. These will be merged into the final PDF when you click "Save & Print PDF".
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && (attachments.length > 0 || localAttachments.length > 0) && (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded border"
            >
              <div className="flex items-center gap-2">
                {getFileIcon(att.id)}
                <span className="text-sm truncate max-w-xs">{att.id}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(att.id)}
                disabled={removeAttachment.isPending}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}

          {localAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
            >
              <div className="flex items-center gap-2">
                {getFileIcon(att.file.name)}
                <span className="text-sm truncate max-w-xs">{att.file.name}</span>
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && attachments.length === 0 && localAttachments.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-400 border rounded-md">
          No attachments uploaded yet
        </div>
      )}
    </div>
  );
}
