"use client";

import React, { useState } from "react";
import { useAPI } from "@/hooks/useAPI";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

interface ResearchUploadProps {
  carId: string;
  onUpload: () => void;
}

export function ResearchUpload({
  carId,
  onUpload,
}: ResearchUploadProps): JSX.Element {
  const api = useAPI();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Guard clause for API availability
  if (!api) {
    return (
      <div className="py-2 text-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList) {
      const newFiles = Array.from(fileList);
      setSelectedFiles(newFiles);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("carId", carId);

        await api.upload("research/upload", formData);
      }

      // Clear selected files and notify parent
      setSelectedFiles([]);
      onUpload();
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        id="research-file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <label htmlFor="research-file">
        <Button variant="outline" size="sm" asChild disabled={isUploading}>
          <span>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Research
          </span>
        </Button>
      </label>
      {selectedFiles.length > 0 && (
        <Button
          size="sm"
          onClick={handleUpload}
          disabled={isUploading}
          className="ml-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              Upload {selectedFiles.length} file
              {selectedFiles.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
