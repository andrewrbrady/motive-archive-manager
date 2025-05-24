import React from "react";
import { useGalleryState } from "@/hooks/useGalleryState";
import { CarImageGalleryV2 } from "./CarImageGalleryV2";
import { Upload, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import GalleryUploader from "./GalleryUploader";

interface GalleryContainerProps {
  carId: string;
  car?: {
    _id: string;
    year: number;
    make: string;
    model: string;
    primaryImageId?: string;
  };
}

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "analyzing" | "complete" | "error";
  currentStep: string;
  error?: string;
}

interface ProgressCallbacks {
  onProgress: (file: File, progress: number) => void;
  onSuccess: (file: File) => void;
  onError: (file: File, error: Error) => void;
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
  car,
}) => {
  const { state, actions } = useGalleryState(carId);
  const [uploadModalOpen, setUploadModalOpen] = React.useState(false);
  const [status, setStatus] = React.useState<{ status: string }>({
    status: "idle",
  });

  // Memoize normalized images for gallery
  const normalizedImages = React.useMemo(
    () =>
      state.images.map((img) => ({
        _id: img.id,
        url: img.url,
        metadata: img.metadata,
        filename: img.filename,
      })),
    [state.images]
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
        // [REMOVED] // [REMOVED] console.log(`Setting primary image ID to: ${imageId} for car ${carId}`);

        const response = await fetch(`/api/cars/${carId}/thumbnail`, {
          method: "PATCH",
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
      // No-op: handled by GalleryUploader
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
      {state.mode === "editing" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Images
            </Button>
          </div>
        </div>
      )}

      <div className="image-gallery-wrapper relative">
        <div
          className={`transition-opacity duration-300 ${
            state.isSyncing ? "opacity-60" : "opacity-100"
          }`}
        >
          <CarImageGalleryV2
            images={normalizedImages}
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
            onSetPrimary={(image) => handlePrimaryImageChange(image._id)}
            onUpload={async () => {}}
            onEditToggle={() =>
              actions.handleModeTransition(
                state.mode === "editing" ? "viewing" : "editing"
              )
            }
          />
        </div>
      </div>

      {/* Upload Modal */}
      <GalleryUploader
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        carId={carId}
        actions={actions}
        toast={toast}
      />
    </div>
  );
};
