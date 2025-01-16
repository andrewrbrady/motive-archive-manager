"use client";

import React, { useState } from "react";
import ImageManager from "@/components/ImageManager";
import { Loader2 } from "lucide-react";

interface CarImageEditorProps {
  carId: string;
  currentImages: string[];
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
      const response = await fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ images: selectedImages }),
      });

      if (!response.ok) {
        throw new Error("Failed to update images");
      }

      onImagesUpdate?.();
    } catch (error) {
      console.error("Error updating car images:", error);
      // You might want to add toast notifications here
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
        selectedImages={currentImages}
        onSelect={(imageUrl) => {
          const newImages = currentImages.includes(imageUrl)
            ? currentImages.filter((url) => url !== imageUrl)
            : [...currentImages, imageUrl];
          handleImagesChange(newImages);
        }}
        maxSelection={10}
        showUploader={true}
      />
    </div>
  );
}
