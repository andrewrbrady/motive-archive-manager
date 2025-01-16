"use client";

import React, { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface ImageUploaderProps {
  onUploadComplete?: (imageUrls: string[]) => void;
  metadata?: Record<string, string>;
  maxFiles?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  metadata = {},
  maxFiles = 10,
  className = "",
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSelectedFiles((prev) => {
        const newFiles = [...prev, ...acceptedFiles];
        return newFiles.slice(0, maxFiles);
      });
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));

    const response = await fetch("/api/cloudflare/images", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.imageUrl;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const imageUrl = await uploadFile(file);
        uploadedUrls.push(imageUrl);

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      }

      onUploadComplete?.(uploadedUrls);
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 cursor-pointer
          ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          transition-colors duration-200
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500">
            Drag and drop images here, or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supports: PNG, JPG, JPEG, WebP (max {maxFiles} files)
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Selected files:</div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span className="text-sm truncate flex-1">{file.name}</span>
                {uploading && uploadProgress[file.name] !== undefined ? (
                  <div className="w-16 text-right">
                    <span className="text-xs text-gray-500">
                      {uploadProgress[file.name]}%
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg
              hover:bg-blue-600 transition-colors disabled:opacity-50
              disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading
              ? "Uploading..."
              : `Upload ${selectedFiles.length} ${
                  selectedFiles.length === 1 ? "file" : "files"
                }`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
