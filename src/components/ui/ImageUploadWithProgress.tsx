import React, { useRef, useState } from "react";
import { Upload, Check, X as XIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadWithProgressProps {
  onComplete?: () => void;
  onError?: (error: string) => void;
  multiple?: boolean;
}

interface FileProgress {
  file: File;
  percent: number;
  status: "idle" | "uploading" | "complete" | "error";
  error?: string;
}

const ImageUploadWithProgress: React.FC<ImageUploadWithProgressProps> = ({
  onComplete,
  onError,
  multiple = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  // Handle file selection or drop
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setOverallError(null);
    setPendingFiles(Array.from(files));
    setProgress([]); // Reset progress if new files are selected
  };

  // Start upload after confirmation
  const startUpload = async () => {
    if (pendingFiles.length === 0) return;
    setIsUploading(true);
    setOverallError(null);
    const fileProgress: FileProgress[] = pendingFiles.map((file) => ({
      file,
      percent: 0,
      status: "idle",
    }));
    setProgress(fileProgress);
    let completed = 0;
    const updatedProgress = [...fileProgress];

    for (let i = 0; i < fileProgress.length; i++) {
      updatedProgress[i].status = "uploading";
      setProgress([...updatedProgress]);
      try {
        await uploadSingleFile(fileProgress[i].file, (percent) => {
          updatedProgress[i].percent = percent;
          setProgress([...updatedProgress]);
        });
        updatedProgress[i].status = "complete";
        updatedProgress[i].percent = 100;
        setProgress([...updatedProgress]);
        completed++;
      } catch (err: any) {
        updatedProgress[i].status = "error";
        updatedProgress[i].error = err?.message || "Upload failed";
        setProgress([...updatedProgress]);
        setOverallError("One or more uploads failed.");
        if (onError) onError(updatedProgress[i].error!);
      }
    }
    setIsUploading(false);
    if (completed === fileProgress.length && onComplete) {
      onComplete();
    }
    setPendingFiles([]); // Clear pending files after upload
  };

  const uploadSingleFile = (
    file: File,
    onProgress: (percent: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("files", file);
      xhr.open("POST", "/api/images/upload");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error("Upload failed: " + xhr.statusText));
        }
      };
      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };
      xhr.send(formData);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  // Calculate overall percent
  const overallPercent =
    progress.length > 0
      ? Math.floor(
          progress.reduce((acc, p) => acc + p.percent, 0) / progress.length
        )
      : 0;
  const allComplete =
    progress.length > 0 && progress.every((p) => p.status === "complete");

  // Remove a file from pending list
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* File select/drop UI, only if not uploading and no progress yet */}
      {progress.length === 0 && !isUploading && (
        <div
          className={cn(
            "border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-background"
          )}
          tabIndex={0}
          role="button"
          aria-disabled={isUploading}
          onClick={handleClick}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFiles(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="Upload images"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            className="hidden"
            onChange={handleInputChange}
            disabled={isUploading}
          />
          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
          <div className="text-sm font-medium">
            Click to select or drag and drop images
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Images up to 5MB each
          </div>
        </div>
      )}

      {/* Pending files list and confirm button */}
      {pendingFiles.length > 0 && progress.length === 0 && !isUploading && (
        <div className="mt-4 w-full">
          <div className="mb-2 font-medium">Files to upload:</div>
          <ul className="w-full max-w-[350px] overflow-hidden mb-4 divide-y divide-border rounded border border-border bg-background">
            {pendingFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center w-full max-w-full min-w-0 px-3 py-2 text-sm overflow-hidden"
              >
                <span className="truncate flex-1 min-w-0 max-w-full block whitespace-nowrap">
                  {file.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 flex-shrink-0"
                  onClick={() => removePendingFile(i)}
                  aria-label={`Remove ${file.name}`}
                  disabled={isUploading}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            className="w-full"
            onClick={startUpload}
            disabled={isUploading || pendingFiles.length === 0}
          >
            Start Upload
          </Button>
        </div>
      )}

      {/* Progress UI */}
      {progress.length > 0 && (
        <div className="mt-4 w-full">
          <div
            className="relative w-full max-w-[350px] h-3 bg-secondary rounded-full overflow-hidden border border-border"
            role="progressbar"
            aria-valuenow={overallPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall upload progress"
          >
            <div
              className={cn(
                "absolute left-0 top-0 h-full transition-all duration-300",
                allComplete
                  ? "bg-success"
                  : overallPercent === 0
                    ? "bg-muted"
                    : "bg-primary"
              )}
              style={{ width: `${overallPercent}%` }}
            />
            {overallPercent > 0 && overallPercent < 100 && (
              <div
                className="absolute left-0 top-0 h-full w-full pointer-events-none"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 8px, transparent 8px 16px)",
                  width: `${overallPercent}%`,
                }}
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center select-none">
            {overallPercent}% overall
          </div>
          <ul className="w-full max-w-[350px] overflow-hidden mt-2 space-y-2">
            {progress.map((p, i) => (
              <li
                key={i}
                className="flex items-center w-full max-w-full min-w-0 px-3 py-2 text-sm overflow-hidden bg-background rounded"
              >
                <span className="truncate flex-1 min-w-0 max-w-full block whitespace-nowrap">
                  {p.file.name}
                </span>
                <span>
                  {p.status === "complete" && (
                    <span className="flex items-center gap-1 text-success">
                      <Check className="w-4 h-4" /> Done
                    </span>
                  )}
                  {p.status === "error" && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XIcon className="w-4 h-4" /> Error
                    </span>
                  )}
                  {p.status === "uploading" && (
                    <span className="flex items-center gap-1 text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading
                    </span>
                  )}
                  {p.status === "idle" && <span>Waiting</span>}
                </span>
              </li>
            ))}
          </ul>
          {overallError && (
            <div className="text-xs text-destructive mt-2 text-center">
              {overallError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploadWithProgress;
