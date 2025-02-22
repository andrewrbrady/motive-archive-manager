import React, { useState } from "react";
import { ImageGallery } from "./ImageGallery";
import { DeleteImageDialog } from "./DeleteImageDialog";

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

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "analyzing" | "complete" | "error";
  error?: string;
  currentStep?: string;
}

interface DeleteStatus {
  imageId: string;
  filename: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
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
}: ImageUploadWithContextProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<
    Array<{ index: number; image: Image }>
  >([]);
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [context, setContext] = useState("");

  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContext(newValue);
    onContextChange(newValue);
  };

  const handleDeleteConfirm = async (deleteFromStorage: boolean) => {
    if (imagesToDelete.length === 0) return;

    setIsDeleting(true);
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
      // Wait longer if there's an error so user can see it
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setImagesToDelete([]);
      // Don't clear deleteStatus here - let it persist until dialog is closed
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      <div className="bg-white dark:bg-[var(--background-primary)] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <ImageGallery
          images={images}
          isEditMode={isEditMode}
          onRemoveImage={(indices) => {
            const imagesToDelete = indices.map((index) => ({
              index,
              image: images[index],
            }));
            setImagesToDelete(imagesToDelete);
            // Initialize delete status when opening dialog
            setDeleteStatus(
              imagesToDelete.map(({ image }) => ({
                imageId: image.id,
                filename: image.filename,
                status: "pending",
              }))
            );
            setDeleteDialogOpen(true);
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Additional Context
                </label>
                <textarea
                  id="uploadContext"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-gray-950 dark:focus:ring-gray-300 focus:border-gray-950 dark:focus:border-gray-300 dark:bg-[var(--background-primary)] dark:text-gray-300"
                  rows={3}
                  placeholder="Add any additional details about the vehicle, location, or specific features you'd like the AI to focus on..."
                  value={context}
                  onChange={handleContextChange}
                />
              </div>
            )
          }
        />

        <DeleteImageDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setImagesToDelete([]);
            setDeleteStatus([]);
          }}
          onConfirm={handleDeleteConfirm}
          imageCount={imagesToDelete.length}
          deleteStatus={deleteStatus}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
