"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { CarImage } from "@/types/car";

interface UploadResponse {
  imageUrl: string;
  metadata: CarImage["metadata"];
}

interface ImageProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  imageUrl?: string;
  metadata?: CarImage["metadata"];
  error?: string;
}

interface ImageUploaderProps {
  onUploadComplete?: (uploadedUrls: string[]) => void;
  onImageProgress?: (progress: ImageProgress) => void;
  metadata?: Record<string, string>;
  maxSelection?: number;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  onImageProgress,
  metadata = {},
  maxSelection = 10,
  className = "",
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSelectedFiles((prev) => {
        const newFiles = [...prev, ...acceptedFiles];
        return newFiles.slice(0, maxSelection);
      });
    },
    [maxSelection]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: maxSelection,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));

    onImageProgress?.({
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });

    const response = await fetch("/api/cloudflare/images", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return { imageUrl: data.imageUrl, metadata: data.metadata };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (files.length > maxSelection) {
      alert(`You can only upload up to ${maxSelection} images at a time.`);
      return;
    }

    // Upload first image and show it immediately
    const firstFile = files[0];
    const formData = new FormData();
    formData.append("file", firstFile);

    onImageProgress?.({
      fileName: firstFile.name,
      progress: 0,
      status: "uploading",
    });

    try {
      const response = await fetch("/api/cloudflare/images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      onImageProgress?.({
        fileName: firstFile.name,
        progress: 100,
        status: "complete",
        imageUrl: data.imageUrl,
        metadata: data.metadata,
      });

      // Show first image immediately
      onUploadComplete?.([data.imageUrl]);

      // Upload remaining files in the background
      if (files.length > 1) {
        const remainingFiles = files.slice(1);
        const uploadRemainingFiles = async () => {
          const remainingUrls: string[] = [];

          for (const file of remainingFiles) {
            const formData = new FormData();
            formData.append("file", file);

            onImageProgress?.({
              fileName: file.name,
              progress: 0,
              status: "uploading",
            });

            try {
              const response = await fetch("/api/cloudflare/images", {
                method: "POST",
                body: formData,
              });

              if (!response.ok) {
                throw new Error("Failed to upload image");
              }

              const data = await response.json();
              onImageProgress?.({
                fileName: file.name,
                progress: 100,
                status: "complete",
                imageUrl: data.imageUrl,
                metadata: data.metadata,
              });

              remainingUrls.push(data.imageUrl);
            } catch (error) {
              console.error("Error uploading image:", error);
              onImageProgress?.({
                fileName: file.name,
                progress: 0,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to upload image",
              });
            }
          }

          if (remainingUrls.length > 0) {
            onUploadComplete?.(remainingUrls);
          }
        };

        // Start background upload
        uploadRemainingFiles();
      }
    } catch (error) {
      console.error("Error uploading first image:", error);
      onImageProgress?.({
        fileName: firstFile.name,
        progress: 0,
        status: "error",
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      });
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);

    // Upload first file immediately
    const firstFile = selectedFiles[0];
    try {
      onImageProgress?.({
        fileName: firstFile.name,
        progress: 0,
        status: "pending",
      });

      const { imageUrl, metadata: uploadMetadata } = await uploadFile(
        firstFile
      );

      onImageProgress?.({
        fileName: firstFile.name,
        progress: 50,
        status: "analyzing",
        imageUrl,
      });

      try {
        const response = await fetch("/api/openai/analyze-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl,
            vehicleInfo: metadata?.vehicleInfo,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to analyze image");
        }

        const { analysis } = await response.json();

        onImageProgress?.({
          fileName: firstFile.name,
          progress: 100,
          status: "complete",
          imageUrl,
          metadata: {
            ...uploadMetadata,
            ...analysis,
          },
        });

        // Show first image immediately
        onUploadComplete?.([imageUrl]);

        // Upload remaining files in the background
        if (selectedFiles.length > 1) {
          const remainingFiles = selectedFiles.slice(1);
          const uploadRemainingFiles = async () => {
            const remainingUrls: string[] = [];

            for (const file of remainingFiles) {
              try {
                onImageProgress?.({
                  fileName: file.name,
                  progress: 0,
                  status: "pending",
                });

                const { imageUrl, metadata: uploadMetadata } = await uploadFile(
                  file
                );

                onImageProgress?.({
                  fileName: file.name,
                  progress: 50,
                  status: "analyzing",
                  imageUrl,
                });

                try {
                  const response = await fetch("/api/openai/analyze-image", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      imageUrl,
                      vehicleInfo: metadata?.vehicleInfo,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error("Failed to analyze image");
                  }

                  const { analysis } = await response.json();

                  onImageProgress?.({
                    fileName: file.name,
                    progress: 100,
                    status: "complete",
                    imageUrl,
                    metadata: {
                      ...uploadMetadata,
                      ...analysis,
                    },
                  });

                  remainingUrls.push(imageUrl);
                } catch (error) {
                  console.error("Error analyzing image:", error);
                  onImageProgress?.({
                    fileName: file.name,
                    progress: 100,
                    status: "complete",
                    imageUrl,
                    metadata: uploadMetadata,
                  });
                  remainingUrls.push(imageUrl);
                }
              } catch (error) {
                console.error("Error uploading file:", error);
                onImageProgress?.({
                  fileName: file.name,
                  progress: 0,
                  status: "error",
                  error: "Failed to upload image",
                });
              }
            }

            if (remainingUrls.length > 0) {
              onUploadComplete?.(remainingUrls);
            }
          };

          // Start background upload
          uploadRemainingFiles();
        }
      } catch (error) {
        console.error("Error analyzing first image:", error);
        onImageProgress?.({
          fileName: firstFile.name,
          progress: 100,
          status: "complete",
          imageUrl,
          metadata: uploadMetadata,
        });
        onUploadComplete?.([imageUrl]);
      }
    } catch (error) {
      console.error("Error uploading first file:", error);
      onImageProgress?.({
        fileName: firstFile.name,
        progress: 0,
        status: "error",
        error: "Failed to upload image",
      });
    } finally {
      setUploading(false);
      setSelectedFiles([]);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 cursor-pointer
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-700"
          }
          transition-colors duration-200 dark:hover:border-gray-600
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag and drop images here, or click to browse
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Supports: PNG, JPG, JPEG, WebP (max {maxSelection} files)
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium dark:text-gray-300">
            Selected files:
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded"
              >
                <span className="text-sm truncate flex-1 dark:text-gray-300">
                  {file.name}
                </span>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
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
              disabled:cursor-not-allowed flex items-center justify-center gap-2
              dark:bg-blue-600 dark:hover:bg-blue-700"
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

      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          <div className="flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Upload Images</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
