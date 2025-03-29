import React, { useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/hooks/useGalleryState";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  uploadProgress: UploadProgress[];
  maxFiles?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  uploadProgress,
  maxFiles = 10,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files at once.`);
        return;
      }
      onUpload(files);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [maxFiles, onUpload]
  );

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="w-full"
          disabled={uploadProgress.length > 0}
        >
          <Upload className="w-4 h-4 mr-2" />
          Add Images
        </Button>
      </div>

      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress, index) => (
            <div key={index} className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="truncate">{progress.fileName}</span>
                <span>
                  {progress.status === "complete"
                    ? "100%"
                    : `${progress.progress}%`}
                </span>
              </div>
              <div className="h-1 bg-[hsl(var(--background-subtle))] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    progress.status === "error"
                      ? "bg-[hsl(var(--destructive))]"
                      : progress.status === "complete"
                      ? "bg-[hsl(var(--success))]"
                      : "bg-[hsl(var(--primary))]"
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-[hsl(var(--destructive))] mt-1">
                  {progress.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
