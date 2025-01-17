"use client";

import React, { useState } from "react";
import { ImageManager } from "@/components/ImageManager";
import { Loader2 } from "lucide-react";

interface CarImageEditorProps {
  carId: string;
  currentImages: {
    id: string;
    url: string;
    filename: string;
    metadata: {
      angle?: string;
      description?: string;
      movement?: string;
      tod?: string;
      view?: string;
    };
    variants?: {
      [key: string]: string;
    };
    createdAt: string;
    updatedAt: string;
  }[];
  onImagesUpdate?: () => void;
}

interface ImageProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  imageUrl?: string;
  metadata?: any;
  error?: string;
}

export default function CarImageEditor({
  carId,
  currentImages,
  onImagesUpdate,
}: CarImageEditorProps) {
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);

  const handleImagesChange = async (selectedImages: string[]) => {
    setSaving(true);
    try {
      // Map the selected image URLs to their corresponding image objects
      const selectedImageObjects = currentImages.filter((img) =>
        selectedImages.includes(img.url)
      );

      const response = await fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: selectedImageObjects }),
      });

      if (!response.ok) {
        throw new Error("Failed to update images");
      }

      onImagesUpdate?.();
    } catch (error) {
      console.error("Error updating car images:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageProgress = (progress: ImageProgress) => {
    setUploadProgress((prev) => {
      const existing = prev.findIndex((p) => p.fileName === progress.fileName);
      if (existing !== -1) {
        const newProgress = [...prev];
        newProgress[existing] = progress;
        return newProgress;
      }
      return [...prev, progress];
    });

    // When an image is complete, update the car's images immediately
    if (
      progress.status === "complete" &&
      progress.imageUrl &&
      progress.metadata
    ) {
      const newImage = {
        id: progress.imageUrl,
        url: progress.imageUrl,
        filename: progress.fileName,
        metadata: progress.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update the car's images immediately with the new image
      const updatedImages = [...currentImages, newImage];

      // Update the backend
      fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: updatedImages }),
      })
        .then((response) => {
          if (response.ok) {
            onImagesUpdate?.();
          }
        })
        .catch((error) => {
          console.error("Error updating car images:", error);
        });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Images</h3>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving changes...
          </div>
        )}
      </div>

      <ImageManager
        selectedImages={currentImages.map((img) => img.url)}
        onSelect={(imageUrl) => {
          const newImages = currentImages
            .map((img) => img.url)
            .includes(imageUrl)
            ? currentImages.filter((img) => img.url !== imageUrl)
            : [
                ...currentImages,
                {
                  id: imageUrl,
                  url: imageUrl,
                  filename: imageUrl.split("/").pop() || "",
                  metadata: {},
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ];
          handleImagesChange(newImages.map((img) => img.url));
        }}
        maxSelection={10}
        showUploader={true}
        onImageProgress={handleImageProgress}
      />

      {uploadProgress.length > 0 && (
        <div className="mt-4 space-y-2 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-3">Upload Progress</h4>
          {uploadProgress.map((progress) => (
            <div
              key={progress.fileName}
              className="flex items-center gap-3 text-sm"
            >
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700">{progress.fileName}</span>
                  <span className="text-gray-500">
                    {progress.status === "error"
                      ? "Error"
                      : `${progress.progress}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      progress.status === "error"
                        ? "bg-red-500"
                        : progress.status === "complete"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                {progress.status === "error" && (
                  <p className="text-xs text-red-500 mt-1">{progress.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
