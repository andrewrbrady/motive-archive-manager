"use client";

import React, { useState, useRef } from "react";
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
  contextInput?: React.ReactNode;
  carId?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadComplete,
  onImageProgress,
  metadata = {},
  maxSelection = 10,
  className = "",
  contextInput,
  carId,
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));
    if (carId) {
      formData.append("carId", carId);
    }

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

    setUploading(true);
    const firstFile = files[0];

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
        if (files.length > 1) {
          const remainingFiles = files.slice(1);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={className}>
      {contextInput}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUploader;
