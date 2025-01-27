import React, { useState } from "react";
import { ImageGallery } from "./ImageGallery";
import { DeleteImageDialog } from "./DeleteImageDialog";

interface DeleteStatus {
  imageId: string;
  status: "pending" | "deleting" | "complete" | "error";
  error?: string;
}

interface ImageUploadWithContextProps {
  images: any[];
  isEditMode: boolean;
  onRemoveImage: (indices: number[]) => void;
  onImagesChange: (files: FileList) => void;
  uploading: boolean;
  uploadProgress: any[];
  setUploadProgress: (progress: any[]) => void;
  showMetadata?: boolean;
  showFilters?: boolean;
  vehicleInfo?: {
    year: number;
    make: string;
    model: string;
    type?: string;
  };
  title: string;
  onContextChange: (context: string) => void;
}

export default function ImageUploadWithContext({
  images,
  isEditMode,
  onRemoveImage,
  onImagesChange,
  uploading,
  uploadProgress,
  setUploadProgress,
  showMetadata = true,
  showFilters = false,
  vehicleInfo,
  title,
  onContextChange,
}: ImageUploadWithContextProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imagesToDelete, setImagesToDelete] = useState<
    Array<{ index: number; image: any }>
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
          status: "deleting",
        }))
      );

      // Call the parent's onRemoveImage with the indices and deleteFromStorage flag
      const indices = imagesToDelete.map((item) => item.index);
      await onRemoveImage(indices);

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
      setDeleteStatus([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Gallery */}
      <div className="bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <ImageGallery
          images={images}
          isEditMode={isEditMode}
          onRemoveImage={(indices) => {
            setImagesToDelete(
              indices.map((index) => ({ index, image: images[index] }))
            );
            setDeleteDialogOpen(true);
          }}
          onImagesChange={onImagesChange}
          uploading={uploading}
          uploadProgress={uploadProgress}
          _setUploadProgress={setUploadProgress}
          showMetadata={showMetadata}
          showFilters={showFilters}
          _vehicleInfo={vehicleInfo}
          title={title}
          aspectRatio="4/3"
          thumbnailsPerRow={8}
          rowsPerPage={3}
          contextInput={
            isEditMode && (
              <div className="mb-4 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <label
                  htmlFor="uploadContext"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Additional Context
                </label>
                <textarea
                  id="uploadContext"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-[#111111] dark:text-gray-300"
                  rows={3}
                  placeholder="Add any additional details about the vehicle, location, or specific features you'd like the AI to focus on..."
                  value={context}
                  onChange={handleContextChange}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This context will help the AI better understand and analyze
                  the images.
                </p>
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
