import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as FileUpload from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";
import { Upload, Check, X as XIcon, Loader2 } from "lucide-react";
import { useImageUploader } from "@/hooks/useImageUploader";
import { cn } from "@/lib/utils";

interface GalleryUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carId: string;
  actions: any;
  toast: any;
}

const GalleryUploader: React.FC<GalleryUploaderProps> = ({
  open,
  onOpenChange,
  carId,
  actions,
  toast,
}) => {
  const {
    uploadImages,
    progress,
    isUploading,
    abort,
    error: uploaderErrorHook,
  } = useImageUploader({ carId, actions, toast });
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Simplified, single-source progress calculation
  const doneCount = progress.filter((p) => p.status === "complete").length;
  const total = progress.length;
  const percent = total > 0 ? Math.floor((doneCount / total) * 100) : 0;
  const displayPercent = total > 0 && doneCount === total ? 100 : percent;

  // Debug log
  console.log("displayPercent", displayPercent, "progress", progress);

  const overallStatus = React.useMemo(() => {
    if (uploaderErrorHook || localError) return "error";

    if (isUploading) {
      return "uploading";
    }
    // Not isUploading
    if (total > 0 && doneCount === total) return "complete";
    return "idle";
  }, [isUploading, total, doneCount, uploaderErrorHook, localError]);

  const handleUpload = async (files: File[], _options: any) => {
    setLocalError(null);
    try {
      await uploadImages(files);
    } catch (err: any) {
      setLocalError(err.message || "Upload failed critically");
    }
  };

  React.useEffect(() => {
    if (!open) {
      abort();
    }
  }, [open, abort]);

  const renderStatus = (p: (typeof progress)[number]) => {
    if (p.status === "complete")
      return (
        <span className="flex items-center gap-1 text-success">
          <Check className="w-4 h-4" /> Complete
        </span>
      );
    if (p.status === "error")
      return (
        <span className="flex items-center gap-1 text-destructive">
          <XIcon className="w-4 h-4" /> Error
        </span>
      );
    if (p.status === "analyzing")
      return (
        <span className="flex items-center gap-1 text-[hsl(var(--accent-warning))]">
          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-primary">
        <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
          <DialogDescription>
            Upload images for this car. You can upload multiple images at once.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden">
          {progress.length > 0 && (
            <div className="mb-4">
              {/* Accessible, themeable progress bar */}
              <div
                className="relative w-full h-3 bg-secondary/60 rounded-full overflow-hidden border border-border"
                role="progressbar"
                aria-valuenow={displayPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Overall upload progress"
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full transition-all duration-300",
                    displayPercent === 100
                      ? "bg-success"
                      : displayPercent === 0
                        ? "bg-muted"
                        : "bg-primary"
                  )}
                  style={{ width: `${displayPercent}%` }}
                />
                {/* Optional: animated stripes for uploading */}
                {displayPercent > 0 && displayPercent < 100 && (
                  <div
                    className="absolute left-0 top-0 h-full w-full pointer-events-none"
                    aria-hidden="true"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 8px, transparent 8px 16px)",
                      width: `${displayPercent}%`,
                    }}
                  />
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 text-center select-none">
                {displayPercent}% overall
              </div>
            </div>
          )}
          <FileUpload.Root
            maxSize={1024 * 1024 * 5}
            accept="image/*"
            onUpload={handleUpload}
            className="w-full"
          >
            <FileUpload.Dropzone className="h-[120px]">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium">Click to upload</span> or drag
                  and drop
                </div>
                <div className="text-xs text-muted-foreground">
                  Images up to 5MB each
                </div>
              </div>
            </FileUpload.Dropzone>
            <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
              {progress.length > 0 ? (
                progress.map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{p.filename}</span>
                      <span>{renderStatus(p)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.currentStep}
                    </div>
                    {p.error && (
                      <div className="text-xs text-destructive mt-1">
                        {p.error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <FileUpload.List />
              )}
              {uploaderErrorHook && (
                <div className="text-xs text-destructive mt-2">
                  {typeof uploaderErrorHook === "string"
                    ? uploaderErrorHook
                    : String(uploaderErrorHook) ||
                      "An uploader error occurred."}
                </div>
              )}
              {localError && (
                <div className="text-xs text-destructive mt-2">
                  {localError}
                </div>
              )}
            </div>
          </FileUpload.Root>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GalleryUploader;
