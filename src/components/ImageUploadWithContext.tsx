"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ImageGallery } from "@/components/ImageGallery";
import {
  StatusNotification,
  DeleteStatus,
  UploadProgress,
} from "@/components/StatusNotification";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { LoadingSpinner } from "@/components/ui/loading";

interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
}

interface Image {
  id: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  variants?: {
    [key: string]: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Define the minimal interface for the CarsClientContext
interface CarsClientContext {
  uploadImages: (
    carId: string,
    files: File[],
    setProgress: (progress: UploadProgress[]) => void
  ) => Promise<void>;
  deleteImage: (
    carId: string,
    imageId: string,
    setStatus: (status: any) => void
  ) => Promise<void>;
}

interface ImageUploadWithContextProps {
  images: Image[];
  isEditMode: boolean;
  onRemoveImage: (indices: number[], deleteFromStorage: boolean) => void;
  onImagesChange: (files: FileList) => void;
  uploading: boolean;
  uploadProgress: UploadProgress[];
  setUploadProgress?: (progress: UploadProgress[]) => void;
  showMetadata?: boolean;
  showFilters?: boolean;
  title: string;
  onContextChange: (context: string) => void;
  carId: string;
  refreshImages: () => void;
  context: CarsClientContext;
}

export default function ImageUploadWithContext({
  images,
  isEditMode,
  onRemoveImage,
  onImagesChange,
  uploading,
  uploadProgress,
  setUploadProgress: _setUploadProgress,
  showMetadata = true,
  showFilters = false,
  title,
  onContextChange,
  carId,
  refreshImages,
  context,
}: ImageUploadWithContextProps) {
  const [imagesToDelete, setImagesToDelete] = useState<
    Array<{ index: number; image: Image }>
  >([]);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextValue, setContextValue] = useState("");

  // Control notification visibility
  const [showNotification, setShowNotification] = useState(false);

  // Show notification whenever uploads or deletions are active
  useEffect(() => {
    if (uploading && uploadProgress.length > 0) {
      setShowNotification(true);
    }
  }, [uploading, uploadProgress]);

  // Handle context changes
  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContextValue(newValue);
    onContextChange(newValue);
  };

  const handleDeleteConfirm = async (deleteFromStorage: boolean) => {
    if (imagesToDelete.length === 0) return;

    setIsDeleting(true);
    setShowNotification(true);

    try {
      // Initialize delete status for each image
      setDeleteStatus(
        imagesToDelete.map(({ image }) => ({
          imageId: image.id,
          filename: image.filename,
          status: "deleting",
        }))
      );

      // Call the parent's onRemoveImage with the indices and deleteFromStorage flag
      const indices = imagesToDelete.map((item) => item.index);
      await onRemoveImage(indices, deleteFromStorage);

      // Update status to complete
      setDeleteStatus((prev) =>
        prev.map((status) => ({
          ...status,
          status: "complete",
        }))
      );

      // Wait a moment to show completion status
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error deleting images:", error);
      // Update status to error
      setDeleteStatus((prev) =>
        prev.map((status) => ({
          ...status,
          status: "error",
          error:
            error instanceof Error ? error.message : "Failed to delete image",
        }))
      );
    } finally {
      setIsDeleting(false);
      setImagesToDelete([]);

      // Keep notification visible for a while after both uploads and deletions are complete
      if (
        !uploading &&
        uploadProgress.every(
          (p) => p.status === "complete" || p.status === "error"
        ) &&
        deleteStatus.every(
          (d) => d.status === "complete" || d.status === "error"
        )
      ) {
        setTimeout(() => {
          setDeleteStatus([]);
          setShowNotification(false);
        }, 3000);
      }
    }
  };

  const closeNotification = () => {
    setShowNotification(false);
    // Only reset the delete status, keep upload progress as it's controlled by the parent
    setDeleteStatus([]);
  };

  const [showDropzone, setShowDropzone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      handleImageUpload(acceptedFiles);
      setShowDropzone(false);
    },
    [carId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/heic": [],
      "image/heif": [],
    },
  });

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return;
    if (_setUploadProgress) {
      // Initialize progress for each file
      const initialProgress = files.map((file) => ({
        fileName: file.name,
        progress: 0,
        status: "pending" as const,
        currentStep: "Starting upload...",
      }));

      _setUploadProgress(initialProgress);

      // Context.uploadImages handles the upload and returns updated progress
      try {
        await context.uploadImages(carId, files, _setUploadProgress);
        // Keep notification visible for a moment after completion
        setTimeout(() => {
          refreshImages();
        }, 1000);
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }
  };

  const handleDeleteImage = async (imageId: string, filename: string) => {
    setIsDeleting(true);
    setShowNotification(true);

    setDeleteStatus((prev) => [
      ...prev,
      {
        imageId,
        filename,
        status: "pending",
      },
    ]);

    try {
      await context.deleteImage(carId, imageId, (status: any) => {
        setDeleteStatus((prev) =>
          prev.map((item) =>
            item.imageId === imageId ? { ...item, ...status } : item
          )
        );
      });

      // Refresh the image gallery after deletion
      setTimeout(() => {
        refreshImages();
      }, 1000);
    } catch (error) {
      console.error("Deletion failed:", error);
      setDeleteStatus((prev) =>
        prev.map((item) =>
          item.imageId === imageId
            ? { ...item, status: "error", error: "Failed to delete image" }
            : item
        )
      );
    }
  };

  const clearNotifications = () => {
    setShowNotification(false);
    if (_setUploadProgress) {
      _setUploadProgress([]);
    }
    setDeleteStatus([]);
    setIsDeleting(false);
  };

  return (
    <div className="relative w-full">
      <div className="mt-4 w-full flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Images</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropzone(!showDropzone)}
            >
              {showDropzone ? <X className="w-4 h-4 mr-2" /> : null}
              {showDropzone ? "Cancel" : "Add Images"}
            </Button>
          </div>
        </div>

        {showDropzone && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <p>Drag and drop images here, or click to select files</p>
            )}
          </div>
        )}

        <ImageGallery
          images={images}
          isEditMode={isEditMode}
          onRemoveImage={(indices, deleteFromStorage) => {
            console.log("ImageUploadWithContext: onRemoveImage called with", {
              indices,
              deleteFromStorage,
              imagesLength: images.length,
            });
            const imagesToDelete = indices.map((index) => ({
              index,
              image: images[index],
            }));
            setImagesToDelete(imagesToDelete);
            // Initialize delete status when showing notification
            setDeleteStatus(
              imagesToDelete.map(({ image }) => ({
                imageId: image.id,
                filename: image.filename,
                status: "pending",
              }))
            );

            // Automatically confirm deletion with the selected option
            handleDeleteConfirm(deleteFromStorage || false);
          }}
          onImagesChange={onImagesChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          showMetadata={showMetadata}
          showFilters={showFilters}
          title={title}
          aspectRatio="4/3"
          thumbnailsPerRow={3}
          rowsPerPage={5}
          carId={carId}
          contextInput={
            isEditMode && (
              <div className="w-full">
                <label
                  htmlFor="uploadContext"
                  className="block text-sm font-medium text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground-subtle))] mb-2"
                >
                  Additional Context
                </label>
                <textarea
                  id="uploadContext"
                  className="w-full px-3 py-2 border border-[hsl(var(--border-primary))] dark:border-[hsl(var(--border-subtle))] rounded-md shadow-sm focus:ring-[hsl(var(--ring))] dark:focus:ring-[hsl(var(--ring))] focus:border-zinc-950 dark:focus:border-[hsl(var(--border-primary))] dark:bg-[var(--background-primary)] dark:text-[hsl(var(--foreground-subtle))]"
                  rows={3}
                  placeholder="Add any additional details about the vehicle, location, or specific features you'd like the AI to focus on..."
                  value={contextValue}
                  onChange={handleContextChange}
                />
              </div>
            )
          }
        />
      </div>

      {/* StatusNotification is now rendered with a portal and doesn't need to be positioned here */}
      {(uploading || isDeleting || showNotification) && (
        <StatusNotification
          uploadProgress={uploadProgress}
          deleteStatus={deleteStatus}
          isUploading={uploading}
          isDeleting={isDeleting}
          onClose={clearNotifications}
        />
      )}
    </div>
  );
}
