import React from "react";
import { useGalleryState } from "@/hooks/useGalleryState";
import { CarImageGalleryV2 } from "./CarImageGalleryV2";
import { Check, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImageData } from "@/lib/imageLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as FileUpload from "@/components/ui/file-upload";

interface GalleryContainerProps {
  carId: string;
}

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "analyzing" | "complete" | "error";
  currentStep: string;
  error?: string;
}

interface CarsClientContext {
  uploadImages: (
    carId: string,
    files: File[],
    setProgress: (
      progress:
        | UploadProgress[]
        | ((prev: UploadProgress[]) => UploadProgress[])
    ) => void
  ) => Promise<void>;
  deleteImage: (
    carId: string,
    imageId: string,
    setStatus: (status: any) => void
  ) => Promise<void>;
}

interface NormalizedImage {
  id: string;
  url: string;
  filename?: string;
  metadata?: {
    category?: string;
    description?: string;
    isPrimary?: boolean;
    [key: string]: any;
  };
}

export const GalleryContainer: React.FC<GalleryContainerProps> = ({
  carId,
}) => {
  const { state, actions } = useGalleryState(carId);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [status, setStatus] = React.useState<{ status: string }>({
    status: "idle",
  });

  const handleImageUpload = React.useCallback(
    async (files: File[]) => {
      try {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append("file", file);
        });
        formData.append("carId", carId);

        const response = await fetch("/api/cloudflare/images", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload images");
        }

        await actions.synchronizeGalleryState();
        setUploadModalOpen(false);
        toast.success("Images uploaded successfully");
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error("Failed to upload images");
      }
    },
    [carId, actions]
  );

  const handleRemoveImage = React.useCallback(
    async (image: NormalizedImage) => {
      try {
        const response = await fetch(`/api/cars/${carId}/images/batch`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageIds: [image.id],
            deleteFromStorage: true,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete images");
        }

        actions.addPendingChange("deletedImageId", image.id);
        await actions.synchronizeGalleryState();
        toast.success("Image removed successfully");
      } catch (error) {
        console.error("Error removing image:", error);
        toast.error("Failed to remove image");
      }
    },
    [carId, actions]
  );

  const handlePrimaryImageChange = React.useCallback(
    async (imageId: string) => {
      try {
        console.log(`Setting primary image ID to: ${imageId} for car ${carId}`);

        const response = await fetch(`/api/cars/${carId}/thumbnail`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ primaryImageId: imageId }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to update primary image" }));
          throw new Error(errorData.error || "Failed to update primary image");
        }

        actions.addPendingChange("primaryImageId", imageId);
        await actions.synchronizeGalleryState();
        toast.success("Primary image updated successfully");
      } catch (error) {
        console.error("Error updating primary image:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update primary image"
        );
      }
    },
    [carId, actions]
  );

  const carsClientContext: CarsClientContext = {
    uploadImages: async (
      carId: string,
      files: File[],
      setProgress: (
        progress:
          | UploadProgress[]
          | ((prev: UploadProgress[]) => UploadProgress[])
      ) => void
    ) => {
      try {
        await handleImageUpload(files);
      } catch (error) {
        console.error("Error in uploadImages:", error);
      }
    },
    deleteImage: async (
      carId: string,
      imageId: string,
      setStatus: (status: any) => void
    ) => {
      try {
        setStatus({ status: "deleting" });
        const image = state.images.find((img) => img.id === imageId);
        if (image) {
          const normalizedImage = {
            id: image.id,
            url: image.url,
            filename: image.filename,
            metadata: image.metadata,
          };
          await handleRemoveImage(normalizedImage);
        }
        setStatus({ status: "complete" });
      } catch (error) {
        console.error("Error in deleteImage:", error);
        setStatus({ status: "error", error: "Failed to delete image" });
      }
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              actions.handleModeTransition(
                state.mode === "editing" ? "viewing" : "editing"
              )
            }
          >
            {state.mode === "editing" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Done Editing
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Gallery
              </>
            )}
          </Button>
          {state.mode === "editing" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
            </Button>
          )}
        </div>
      </div>

      <div className="image-gallery-wrapper mt-4 relative">
        <div
          className={`transition-opacity duration-300 ${
            state.isSyncing ? "opacity-60" : "opacity-100"
          }`}
        >
          <CarImageGalleryV2
            images={state.images.map((img) => ({
              _id: img.id,
              url: img.url,
              metadata: img.metadata,
              filename: img.filename,
            }))}
            showCategoryTabs={true}
            isLoading={state.isSyncing}
            isEditing={state.mode === "editing"}
            onDelete={async (image) => {
              const normalizedImage = {
                id: image._id,
                url: image.url,
                filename: image.filename,
                metadata: image.metadata,
              };
              await handleRemoveImage(normalizedImage);
            }}
            onOpenUploadModal={() => setUploadModalOpen(true)}
          />
        </div>
      </div>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Images</DialogTitle>
            <DialogDescription>
              Upload images for this car. You can upload multiple images at
              once.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden">
            <FileUpload.Root
              maxFiles={10}
              maxSize={1024 * 1024 * 5} // 5MB
              accept="image/*"
              onUpload={async (files, { onProgress, onSuccess, onError }) => {
                try {
                  await handleImageUpload(files);
                  files.forEach((file) => onSuccess(file));
                } catch (error) {
                  files.forEach((file) => onError(file, error as Error));
                }
              }}
              className="w-full"
            >
              <FileUpload.Dropzone className="h-[120px]">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="font-medium">Click to upload</span> or drag
                    and drop
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Images up to 5MB each
                  </div>
                </div>
              </FileUpload.Dropzone>
              <div className="max-h-[200px] overflow-y-auto">
                <FileUpload.List />
              </div>
            </FileUpload.Root>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
