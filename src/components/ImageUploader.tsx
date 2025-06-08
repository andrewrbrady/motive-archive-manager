"use client";

import React, { useState, useRef } from "react";
import { CarImage } from "@/types/car";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";
import { compressImages, needsCompression } from "@/lib/imageCompression";

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
      formData.append("files", file);
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
        const data = (await api.upload("/api/images/upload", formData)) as {
          success: boolean;
          images: Array<{
            url: string;
            metadata?: CarImage["metadata"];
          }>;
          error?: string;
        };

        if (!data.success || !data.images || data.images.length === 0) {
          throw new Error(data.error || "No images were uploaded successfully");
        }

        const uploadedImage = data.images[0];
        let imageUrl = uploadedImage.url;

        if (
          imageUrl &&
          imageUrl.includes("imagedelivery.net") &&
          !imageUrl.match(
            /\/(public|thumbnail|avatar|medium|large|webp|preview|original|w=\d+)$/
          )
        ) {
          imageUrl = `${imageUrl}/w=200,h=200,fit=cover`;
        }

        resolve({
          imageUrl: imageUrl,
          metadata: uploadedImage.metadata || {},
        });
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

        onUploadComplete?.([imageUrl]);

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
