"use client";

import React, { useState, useRef } from "react";
import { CarImage } from "@/types/car";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";

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
  const api = useAPI();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!api) return <div>Loading...</div>;

  const uploadFile = async (file: File): Promise<UploadResponse> => {
    return new Promise(async (resolve, reject) => {
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

      try {
        // Get auth token for XMLHttpRequest
        const token = await getValidToken();

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            // Scale progress to 0-75% during upload
            const uploadProgress = Math.round(
              (event.loaded * 75) / event.total
            );
            onImageProgress?.({
              fileName: file.name,
              progress: uploadProgress,
              status: "uploading",
            });
          }
        });

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                imageUrl: response.imageUrl,
                metadata: response.metadata,
              });
            } catch (error) {
              reject(new Error("Failed to parse upload response"));
            }
          } else {
            reject(new Error("Upload failed"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.open("POST", "/api/cloudflare/images");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      } catch (error) {
        reject(error);
      }
    });
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

      const { imageUrl, metadata: uploadMetadata } =
        await uploadFile(firstFile);

      // Update progress to 75% when starting analysis
      onImageProgress?.({
        fileName: firstFile.name,
        progress: 75,
        status: "analyzing",
        imageUrl,
      });

      try {
        const { analysis } = (await api.post("openai/analyze-image", {
          imageUrl,
          vehicleInfo: metadata?.vehicleInfo,
        })) as { analysis: any };

        // Update to 100% only after analysis is complete
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

                const { imageUrl, metadata: uploadMetadata } =
                  await uploadFile(file);

                onImageProgress?.({
                  fileName: file.name,
                  progress: 75,
                  status: "analyzing",
                  imageUrl,
                });

                try {
                  const { analysis } = (await api.post("openai/analyze-image", {
                    imageUrl,
                    vehicleInfo: metadata?.vehicleInfo,
                  })) as { analysis: any };

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
                    progress: 85,
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
          progress: 85,
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
