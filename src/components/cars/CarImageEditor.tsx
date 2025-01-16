"use client";

import React, { useState } from "react";
import ImageManager from "@/components/ImageManager";
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

export default function CarImageEditor({
  carId,
  currentImages,
  onImagesUpdate,
}: CarImageEditorProps) {
  const [saving, setSaving] = useState(false);

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
                  id: imageUrl, // This should be replaced with proper ID generation
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
      />
    </div>
  );
}
