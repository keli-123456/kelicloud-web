import React, { useRef } from "react";
import { Upload as UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type UploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  accept?: string;
  dragDropText?: React.ReactNode;
  clickToBrowseText?: React.ReactNode;
  hintText?: React.ReactNode;
  uploading?: boolean;
  progress?: number;
  uploadingText?: React.ReactNode;
  cancelUploadLabel?: React.ReactNode;
  onCancelUpload?: () => void;
  onFileSelected?: (file: File) => void;
  closeLabel?: React.ReactNode;
};

function matchesAccept(file: File, accept: string | undefined) {
  if (!accept || accept.trim() === "" || accept === "*/*") return true;
  const items = accept.split(",").map((s) => s.trim().toLowerCase());
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  for (const it of items) {
    if (it.startsWith(".")) {
      if (name.endsWith(it)) return true;
    } else if (it.includes("/")) {
      if (type === it) return true;
      const [m] = it.split("/");
      const [fm] = type.split("/");
      if (m && m === fm) return true;
    }
  }
  return false;
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  accept = "*/*",
  dragDropText,
  clickToBrowseText,
  hintText,
  uploading = false,
  progress = 0,
  uploadingText,
  cancelUploadLabel,
  onCancelUpload,
  onFileSelected,
  closeLabel = "Close",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files.find((f) => matchesAccept(f, accept));
    if (file && onFileSelected) onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && matchesAccept(file, accept) && onFileSelected) {
      onFileSelected(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogTitle>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}

        <div className="mt-4 space-y-4">
          <div
            className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon size={48} className="mx-auto mb-4 text-gray-400" />
            {dragDropText ? (
              <div className="text-lg font-medium">{dragDropText}</div>
            ) : null}
            {clickToBrowseText ? (
              <div className="mt-2 text-sm text-muted-foreground">
                {clickToBrowseText}
              </div>
            ) : null}
            {hintText ? (
              <div className="mt-2 text-xs text-muted-foreground">
                {hintText}
              </div>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {uploading && (
          <div className="z-50 flex items-center justify-center">
            <Card className="min-w-80 max-w-md gap-0 p-6 text-center">
              {uploadingText ? (
                <div className="mb-4 mt-2 text-lg">{uploadingText}</div>
              ) : null}

              <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                >
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {Math.round(Math.max(0, Math.min(100, progress)))}%
                </span>
              </div>

              {onCancelUpload ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancelUpload}
                  disabled={progress >= 100}
                >
                  {cancelUploadLabel ?? "Cancel"}
                </Button>
              ) : null}
            </Card>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline">{closeLabel}</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadDialog;
