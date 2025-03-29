"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ImageGallery } from "@/components/ImageGallery";
import {
  StatusNotification,
  DeleteStatus,
  UploadProgress as StatusUploadProgress,
} from "@/components/StatusNotification";
import { Trash2, Plus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { ProgressItem } from "@/components/ui/UploadProgressTracking";

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
    setProgress: (progress: StatusUploadProgress[]) => void
  ) => Promise<void>;
  deleteImage: (
    carId: string,
    imageId: string,
    setStatus: (status: any) => void
  ) => Promise<void>;
}

// Use our common ProgressItem interface for better type compatibility
interface CustomUploadProgress extends ProgressItem {
  fileName: string;
  progress: number;
  status:
    | "pending"
    | "uploading"
    | "processing"
    | "analyzing"
    | "complete"
    | "error";
  imageUrl?: string;
  metadata?: ImageMetadata;
  error?: string;
  currentStep?: string;
  stepProgress?: {
    cloudflare: {
      status: "pending" | "uploading" | "complete" | "error";
      progress: number;
      message?: string;
    };
    openai: {
      status: "pending" | "analyzing" | "complete" | "error";
      progress: number;
      message?: string;
    };
  };
}

interface ImageUploadWithContextProps {
  images: Image[];
  isEditMode: boolean;
  onRemoveImage: (indices: number[], deleteFromStorage: boolean) => void;
  onImagesChange: (files: FileList) => void;
  uploading: boolean;
  uploadProgress: StatusUploadProgress[];
  setUploadProgress?: (
    progress:
      | StatusUploadProgress[]
      | ((prev: StatusUploadProgress[]) => StatusUploadProgress[])
  ) => void;
  showMetadata?: boolean;
  showFilters?: boolean;
  title: string;
  onContextChange: (context: string) => void;
  carId: string;
  refreshImages: () => void;
  context: CarsClientContext;
  primaryImageId?: string;
  onPrimaryImageChange?: (imageId: string) => void;
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
  primaryImageId,
  onPrimaryImageChange,
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

    // FORCE deleteFromStorage to be true - this is the fix for the issue
    deleteFromStorage = true;

    console.log(
      "[DEBUG] handleDeleteConfirm called with deleteFromStorage=",
      deleteFromStorage,
      "(FORCING TO TRUE)"
    );
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
      // Ensure deleteFromStorage is explicitly true
      const indices = imagesToDelete.map((item) => item.index);
      console.log(
        "[DEBUG] Calling onRemoveImage with deleteFromStorage=",
        deleteFromStorage
      );
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (files: File[]) => {
    if (!files.length) return;
    if (_setUploadProgress) {
      // Initialize progress for each file with our enhanced step tracking
      const initialProgress = files.map(
        (file): StatusUploadProgress => ({
          fileName: file.name,
          progress: 0,
          status: "uploading",
          currentStep: "Preparing to upload...",
          stepProgress: {
            cloudflare: {
              status: "uploading",
              progress: 0,
              message: "Starting upload to Cloudflare...",
            },
            openai: {
              status: "pending",
              progress: 0,
              message: "Waiting for upload to complete...",
            },
          },
        })
      );

      _setUploadProgress(initialProgress);
    }

    try {
      await context.uploadImages(
        carId,
        files,
        (progress: StatusUploadProgress[]) => {
          if (_setUploadProgress) {
            _setUploadProgress(progress);
          }
        }
      );
      console.log("Upload complete!");
      refreshImages();
    } catch (error) {
      console.error("Error uploading images:", error);
      if (_setUploadProgress) {
        _setUploadProgress((current: StatusUploadProgress[]) =>
          current.map(
            (item: StatusUploadProgress): StatusUploadProgress => ({
              ...item,
              status: "error",
              error: error instanceof Error ? error.message : "Upload failed",
            })
          )
        );
      }
    }
  };

  const handleDeleteImage = async (imageId: string, filename: string) => {
    console.log(`=========== handleDeleteImage CALLED ===========`);
    console.log(`Image ID: ${imageId}, Filename: ${filename}`);

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
      console.log(
        `Calling context.deleteImage with carId=${carId}, imageId=${imageId}`
      );

      // Make sure context.deleteImage exists
      if (!context || !context.deleteImage) {
        console.error("context.deleteImage is not available!", context);
        throw new Error("Delete method not available");
      }

      // Call the context's deleteImage method
      await context.deleteImage(carId, imageId, (status: any) => {
        console.log(`Received status update:`, status);
        setDeleteStatus((prev) =>
          prev.map((item) =>
            item.imageId === imageId ? { ...item, ...status } : item
          )
        );
      });

      console.log(`context.deleteImage completed successfully`);

      // Refresh the image gallery after deletion
      console.log(`Refreshing images after successful deletion`);
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
    } finally {
      console.log(`handleDeleteImage processing complete`);
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

  const handleDeleteSingleImage = async (imageId: string, filename: string) => {
    console.log(`[DEBUG] Directly deleting image with ID ${imageId}`);
    await handleDeleteImage(imageId, filename);
  };

  useEffect(() => {
    if (context) {
      // Attach the handler to context for direct access
      (context as any).handleDeleteSingleImage = handleDeleteSingleImage;
    }
  }, [context]);

  // Helper function to extract image ID from Cloudflare image URL
  const extractImageIdFromUrl = (url: string): string | null => {
    // Format: https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/594b1728-88a5-4368-a2f1-91f352872c00/public
    try {
      // Extract the ID segment from the URL (assuming it's the second-to-last path segment)
      const urlParts = url.split("/");
      if (urlParts.length >= 2) {
        // The ID is usually the second-to-last segment
        const potentialId = urlParts[urlParts.length - 2];
        // Check if it looks like a valid ID (contains hyphens or is long enough)
        if (
          potentialId &&
          (potentialId.includes("-") || potentialId.length >= 24)
        ) {
          console.log(
            `[ImageUploadWithContext] Extracted ID ${potentialId} from URL ${url}`
          );
          return potentialId;
        }
      }
    } catch (error) {
      console.error(
        `[ImageUploadWithContext] Failed to extract ID from URL ${url}:`,
        error
      );
    }
    return null;
  };

  // Ensure that images passed from props have valid IDs by extracting from URL if needed
  const processedImages = React.useMemo(() => {
    return images.map((image) => {
      // We still want to keep this logic to ensure all images have IDs for display purposes,
      // but we won't use these extracted IDs for the primary image setting API call
      if (!image.id || image.id.trim() === "") {
        if (image.url) {
          const extractedId = extractImageIdFromUrl(image.url);
          if (extractedId) {
            console.log(
              `[ImageUploadWithContext] Generated ID for image from URL: ${extractedId}`
            );
            return {
              ...image,
              id: extractedId,
            };
          }
        }
      }
      return image;
    });
  }, [images]);

  // Add a function to handle setting the primary image
  const handleSetPrimaryImage = async (imageId: string) => {
    console.log(`[ImageUploadWithContext] Setting primary image to ${imageId}`);

    // Validate the imageId
    if (!imageId || typeof imageId !== "string" || imageId.trim() === "") {
      const errorMsg = `Cannot set primary image: Invalid image ID: ${imageId} (type: ${typeof imageId})`;
      console.error(errorMsg);
      toast.error("Failed to update featured image: Invalid image ID");
      return;
    }

    if (!carId) {
      console.error("Cannot set primary image: Car ID is not available");
      toast.error("Cannot set primary image: Car ID is not available");
      return;
    }

    console.log(
      `[ImageUploadWithContext] Making API request to /api/cars/${carId}/thumbnail with primaryImageId: "${imageId}"`
    );

    try {
      // Make the API request to update the primary image
      const requestBody = JSON.stringify({ primaryImageId: imageId });
      console.log(`Request body: ${requestBody}`);

      const response = await fetch(`/api/cars/${carId}/thumbnail`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      console.log(
        `[ImageUploadWithContext] API response status:`,
        response.status
      );

      if (!response.ok) {
        let errorMessage = "Failed to update featured image";

        try {
          // Try to parse the error as JSON
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("Error response from API (JSON):", errorData);
        } catch (parseError) {
          // If not JSON, get the text
          const errorText = await response.text();
          console.error("Error response from API (text):", errorText);
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Parse the response data
      let responseData;
      try {
        responseData = await response.json();
        console.log("API response data:", responseData);
      } catch (parseError) {
        console.warn(
          "Could not parse response as JSON, but request was successful"
        );
      }

      toast.success("Featured image updated successfully");
      console.log(
        `[ImageUploadWithContext] Featured image updated successfully to ${imageId}`
      );

      // Call the callback if provided
      if (onPrimaryImageChange) {
        console.log(
          `[ImageUploadWithContext] Calling onPrimaryImageChange callback with ${imageId}`
        );
        onPrimaryImageChange(imageId);
      } else {
        console.warn(
          `[ImageUploadWithContext] onPrimaryImageChange callback not provided`
        );
      }
    } catch (error) {
      console.error(
        "[ImageUploadWithContext] Error updating featured image:",
        error
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update featured image"
      );
    }
  };

  // Add logging for primaryImageId
  React.useEffect(() => {
    console.log(
      `[ImageUploadWithContext] primaryImageId: ${primaryImageId || "None"}`
    );
  }, [primaryImageId]);

  // Add logging for the first few processed images
  React.useEffect(() => {
    if (processedImages.length > 0) {
      console.log(
        "[ImageUploadWithContext] First few processed images:",
        processedImages
          .slice(0, Math.min(3, processedImages.length))
          .map((img) => ({
            id: img.id,
            url: img.url,
            isPrimary: primaryImageId === img.id,
          }))
      );
    }
  }, [processedImages, primaryImageId]);

  return (
    <div className="relative w-full" key="image-upload-context-stable">
      <div className="mt-4 w-full flex flex-col gap-4">
        <ImageGallery
          images={processedImages}
          isEditMode={isEditMode}
          onRemoveImage={(indices, deleteFromStorage) => {
            console.log(
              "=========== ImageUploadWithContext: onRemoveImage CALLED ==========="
            );
            console.log(
              "Original deleteFromStorage value:",
              deleteFromStorage,
              `(${typeof deleteFromStorage})`
            );

            console.log("ImageUploadWithContext: onRemoveImage called with", {
              indices,
              deleteFromStorage,
              imagesLength: images.length,
            });

            const imagesToDelete = indices.map((index) => ({
              index,
              image: images[index],
            }));

            console.log(
              `Images to delete:`,
              imagesToDelete.map(({ image }) => ({
                id: image.id,
                filename: image.filename,
              }))
            );

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
            // Always use true for deleteFromStorage regardless of what was passed
            console.log(
              "[DEBUG] Forcing deleteFromStorage to true regardless of passed value:",
              deleteFromStorage
            );

            // Pass true as a literal boolean, not a variable
            handleDeleteConfirm(true);
          }}
          onImagesChange={onImagesChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          showMetadata={showMetadata}
          showFilters={false}
          title={title}
          aspectRatio="4/3"
          thumbnailsPerRow={3}
          rowsPerPage={5}
          carId={carId}
          onDeleteSingleImage={handleDeleteSingleImage}
          externalFileInputRef={fileInputRef}
          onExternalFileSelect={(files) => {
            handleImageUpload(files);
            if (files.length) {
              const fileList = Object.assign([], files, {
                item: (i: number) => files[i],
                length: files.length,
              }) as unknown as FileList;
              onImagesChange(fileList);
            }
          }}
          primaryImageId={primaryImageId}
          onPrimaryImageChange={handleSetPrimaryImage}
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
      {showNotification && (
        <StatusNotification
          show={showNotification}
          uploadProgress={uploadProgress as any}
          deleteStatus={deleteStatus}
          uploading={uploading}
          isDeleting={isDeleting}
          onClose={closeNotification}
          clearNotifications={clearNotifications}
        />
      )}
    </div>
  );
}
