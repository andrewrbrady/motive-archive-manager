"use client";

import React, { useState, useRef } from "react";
import { CarImage } from "@/types/car";
import { useAPI } from "@/hooks/useAPI";
import { getValidToken } from "@/lib/api-client";
import { compressImages, needsCompression } from "@/lib/imageCompression";
import { optimizeImageForUpload } from "@/lib/imageOptimization";

interface UploadResponse {
  imageUrl: string;
  metadata: CarImage["metadata"];
}

interface ImageProgress {
  fileName: string;
  progress: number;
  status:
    | "pending"
    | "optimizing"
    | "uploading"
    | "analyzing"
    | "complete"
    | "error";
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
      try {
        // Phase 1: Optimize image client-side
        onImageProgress?.({
          fileName: file.name,
          progress: 0,
          status: "optimizing",
        });

        const optimizationResult = await optimizeImageForUpload(file, {
          context: carId ? "car" : "general",
          quality: 0.95, // High quality preservation
        });

        const optimizedFile = optimizationResult.optimizedFile;

        // Phase 2: Upload optimized file
        onImageProgress?.({
          fileName: file.name,
          progress: 25,
          status: "uploading",
        });

        const formData = new FormData();
        formData.append("files", optimizedFile);
        formData.append(
          "metadata",
          JSON.stringify({
            ...metadata,
            optimized: true,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            compressionRatio: optimizationResult.compressionRatio,
            format: file.type, // Preserve original format
          })
        );
        if (carId) {
          formData.append("carId", carId);
        }

        const data = (await api.upload("/api/cloudflare/images", formData)) as {
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
        console.error("Image upload/optimization failed:", error);
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
    const uploadedUrls: string[] = [];

    try {
      console.log(`🚀 Starting PARALLEL upload of ${files.length} files`);

      // Process ALL files in parallel - this is the key fix!
      const uploadPromises = files.map(async (file, index) => {
        try {
          console.log(
            `📤 Starting upload ${index + 1}/${files.length}: ${file.name}`
          );

          onImageProgress?.({
            fileName: file.name,
            progress: 0,
            status: "pending",
          });

          // Upload file (with optimization)
          const { imageUrl, metadata: uploadMetadata } = await uploadFile(file);

          console.log(
            `✅ Upload complete ${index + 1}/${files.length}: ${file.name}`
          );

          onImageProgress?.({
            fileName: file.name,
            progress: 75,
            status: "analyzing",
            imageUrl,
          });

          // Analyze image (this can also be parallel)
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

            console.log(
              `🔍 Analysis complete ${index + 1}/${files.length}: ${file.name}`
            );
            return imageUrl;
          } catch (analysisError) {
            console.error(`Analysis failed for ${file.name}:`, analysisError);
            onImageProgress?.({
              fileName: file.name,
              progress: 100,
              status: "complete",
              imageUrl,
              metadata: uploadMetadata,
            });
            return imageUrl; // Still return URL even if analysis fails
          }
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          onImageProgress?.({
            fileName: file.name,
            progress: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
          });
          return null;
        }
      });

      // Wait for ALL uploads to complete in parallel
      console.log(`⏳ Waiting for all ${files.length} uploads to complete...`);
      const results = await Promise.allSettled(uploadPromises);

      // Collect successful uploads
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          uploadedUrls.push(result.value);
          console.log(`✅ Collected result ${index + 1}: ${result.value}`);
        }
      });

      console.log(
        `🎉 All uploads complete! ${uploadedUrls.length}/${files.length} successful`
      );

      if (uploadedUrls.length > 0) {
        onUploadComplete?.(uploadedUrls);
      }
    } catch (error) {
      console.error("Batch upload failed:", error);
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
