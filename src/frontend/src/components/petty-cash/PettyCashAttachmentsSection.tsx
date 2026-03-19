import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../../backend";
import {
  useAddPettyCashAttachment,
  useGetPettyCashAttachments,
  useRemovePettyCashAttachment,
} from "../../hooks/useQueries";

interface Props {
  date: bigint;
}

export default function PettyCashAttachmentsSection({ date }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [], isLoading } =
    useGetPettyCashAttachments(date);
  const addAttachment = useAddPettyCashAttachment();
  const removeAttachment = useRemovePettyCashAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "application/pdf",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const blob = ExternalBlob.fromBytes(bytes);
        const attachmentId = `${Date.now()}-${file.name}`;

        await addAttachment.mutateAsync({
          date,
          attachment: { id: attachmentId, blob },
        });
        toast.success(`Uploaded: ${file.name}`);
      } catch (err: any) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async (attachmentId: string) => {
    removeAttachment.mutate(
      { date, attachmentId },
      {
        onSuccess: () => toast.success("Attachment removed"),
        onError: (e) => toast.error(`Failed: ${e.message}`),
      },
    );
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label>Attachments</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isLoading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPG, PDF — max 10MB each
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && attachments.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 bg-muted/50 rounded border"
            >
              <div className="flex items-center gap-2">
                {att.id.toLowerCase().endsWith(".pdf") ? (
                  <FileText className="h-4 w-4 text-destructive" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm truncate max-w-xs">{att.id}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleRemove(att.id)}
                disabled={removeAttachment.isPending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!isLoading && attachments.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
          No attachments yet
        </div>
      )}
    </div>
  );
}
