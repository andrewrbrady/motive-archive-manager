import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProgressCallbacks {
  onProgress: (file: File, progress: number) => void;
  onSuccess: (file: File) => void;
  onError: (file: File, error: Error) => void;
}

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  currentStep?: string;
  error?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], callbacks: ProgressCallbacks) => Promise<void>;
  progress: UploadProgress[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  progress,
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp", ".heic", ".heif"],
    },
  });

  const handleUpload = () => {
    if (files.length === 0) return;

    // Immediate optimistic feedback
    console.log("Starting upload in background...");

    // Background upload operation - non-blocking
    const uploadOperation = async () => {
      try {
        await onUpload(files, {
          onProgress: (file: File, progress: number) => {
            // [REMOVED] // [REMOVED] console.log(`Progress for ${file.name}: ${progress}%`);
          },
          onSuccess: (file: File) => {
            // [REMOVED] // [REMOVED] console.log(`Upload complete for ${file.name}`);
          },
          onError: (file: File, error: Error) => {
            console.error(`Upload failed for ${file.name}:`, error);
          },
        });
      } catch (error) {
        console.error("Upload failed:", error);
      }
    };

    // Execute upload in background - non-blocking
    setTimeout(uploadOperation, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>
            Drop your images here or click to browse
          </DialogDescription>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragging ? "border-primary bg-secondary" : "border-border",
            "hover:border-primary hover:bg-secondary"
          )}
        >
          <input {...getInputProps()} />
          <p>Drag & drop images here, or click to select files</p>
        </div>

        {/* File List and Progress */}
        {(files.length > 0 || progress.length > 0) && (
          <div className="mt-4 space-y-2">
            {progress.length > 0
              ? // Show progress for files being uploaded
                progress.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{p.filename}</span>
                      <span>{p.currentStep}</span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                    {p.error && (
                      <p className="text-sm text-destructive">{p.error}</p>
                    )}
                  </div>
                ))
              : // Show selected files before upload
                files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={progress.some((p) => p.status === "uploading")}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              files.length === 0 ||
              progress.some((p) => p.status === "uploading")
            }
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
