"use client";

import React, { useState, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Loader2, Trash2, ZoomIn } from "lucide-react";
import Image from "next/image";
import { CarImage } from "@/types/car";

interface ImageProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  imageUrl?: string;
  metadata?: CarImage["metadata"];
  error?: string;
}

interface ImageManagerProps {
  onSelect?: (imageUrl: string) => void;
  selectedImages?: string[];
  maxSelection?: number;
  showUploader?: boolean;
  className?: string;
  onImageProgress?: (progress: ImageProgress) => void;
  carId?: string;
}

export default function ImageManager({
  onSelect,
  selectedImages = [],
  maxSelection = 10,
  showUploader = false,
  className = "",
  onImageProgress,
  carId,
}: ImageManagerProps) {
  const [uploadProgress, setUploadProgress] = useState<ImageProgress[]>([]);

  const handleImageUpload = async (_uploadedUrls: string[]) => {
    // Clear upload progress when all uploads are complete
    setUploadProgress([]);
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

    // Forward the progress to the parent component
    onImageProgress?.(progress);
  };

  return (
    <div className={className}>
      {showUploader && (
        <div className="mb-8">
          <ImageUploader
            onUploadComplete={handleImageUpload}
            onImageProgress={handleImageProgress}
            maxSelection={maxSelection}
            carId={carId}
          />
          {uploadProgress.length > 0 && (
            <div className="mt-4 space-y-2">
              {uploadProgress.map((progress) => (
                <div
                  key={progress.fileName}
                  className="bg-gray-50 p-3 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {progress.fileName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {progress.status === "error"
                        ? "Error"
                        : `${progress.progress}%`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
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
                    <p className="text-xs text-red-500">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
