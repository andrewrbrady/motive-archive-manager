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
import { cn } from "@/lib/utils";

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
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgress[]>(
    []
  );
  const [status, setStatus] = React.useState<{ status: string }>({
    status: "idle",
  });

  const handleFileUploadProgress = React.useCallback(
    async (
      files: File[],
      { onProgress, onSuccess, onError }: ProgressCallbacks
    ) => {
      console.log("FileUpload component triggered upload:", {
        numberOfFiles: files.length,
        fileNames: files.map((f) => f.name),
      });

      try {
        // Mark all files as starting upload
        files.forEach((file) => {
          onProgress(file, 0);
        });

        // Track progress for each file
        const fileProgressMap = new Map(files.map((file) => [file.name, 0]));
        const fileStatusMap = new Map(files.map((file) => [file.name, true])); // Track if file is still processing

        // Create a single FormData object with all files
        const formData = new FormData();

        // Add all files to the formData
        files.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });

        formData.append("fileCount", files.length.toString());
        formData.append("carId", carId);

        // Update all files to 10% progress to show we're starting
        files.forEach((file) => {
          fileProgressMap.set(file.name, 10);
          onProgress(file, 10);
        });

        // Send the request
        const response = await fetch("/api/cloudflare/images", {
          method: "POST",
          body: formData,
        });

        if (!response.ok || !response.body) {
          throw new Error("Upload failed");
        }

        // Set up the reader for the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Process the streaming response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const data = JSON.parse(line.slice(5));

              // Handle overall completion status
              if (data.type === "complete") {
                console.log("Upload complete:", data);
                // Mark all remaining files as completed
                files.forEach((file) => {
                  if (fileProgressMap.get(file.name) < 100) {
                    onProgress(file, 100);
                    onSuccess(file);
                  }
                });
                break;
              }

              // Handle file-specific updates
              if (data.fileName) {
                const file = files.find((f) => f.name === data.fileName);
                if (!file) continue;

                // Update progress based on status
                if (data.status === "error") {
                  fileStatusMap.set(data.fileName, false);
                  onError(file, new Error(data.error || "Failed to upload"));
                } else if (data.status === "complete") {
                  fileProgressMap.set(data.fileName, 100);
                  onProgress(file, 100);
                  onSuccess(file);
                } else if (data.progress) {
                  const currentProgress = fileProgressMap.get(data.fileName);
                  const newProgress = Math.max(
                    currentProgress !== undefined ? currentProgress : 0,
                    data.progress
                  );
                  fileProgressMap.set(data.fileName, newProgress);
                  onProgress(file, newProgress);
                }
              }

              // Handle error message
              if (data.type === "error") {
                console.error("Server reported error:", data.error);
                throw new Error(data.error || "Unknown server error");
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e, "Raw data:", line);
            }
          }
        }

        // Handle any files that weren't explicitly completed or errored
        files.forEach((file) => {
          const status = fileStatusMap.get(file.name);
          const progress = fileProgressMap.get(file.name);
          if (status && progress !== undefined && progress < 100) {
            onProgress(file, 100);
            onSuccess(file);
          }
        });

        // Sync gallery state to show the new images
        await actions.synchronizeGalleryState();

        // Count successful uploads
        const successful = files.filter((file) => {
          const progress = fileProgressMap.get(file.name);
          return progress !== undefined && progress === 100;
        }).length;
        const total = files.length;

        if (successful > 0) {
          setUploadModalOpen(false);
          toast.success("Upload Complete", {
            description: `Successfully uploaded ${successful} of ${total} files`,
          });
        } else {
          toast.error("Upload Failed", {
            description: "Failed to upload any images",
          });
        }
      } catch (error) {
        console.error("Upload failed, calling onError for each file:", error);
        files.forEach((file) => {
          onError(
            file,
            error instanceof Error ? error : new Error("Upload failed")
          );
        });
      }
    },
    [carId, actions]
  );

  const handleImageUpload = React.useCallback(
    async (files: File[]) => {
      console.log("Starting image upload process:", {
        numberOfFiles: files.length,
        carId,
        fileNames: files.map((f) => f.name),
      });

      try {
        // Initialize progress tracking for each file
        setUploadProgress(
          files.map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            filename: file.name,
            progress: 0,
            status: "uploading" as const,
            currentStep: "Starting upload",
          }))
        );

        // Create a simple progress tracker for handleFileUploadProgress
        const progressTracker = {
          onProgress: (file: File, progress: number) => {
            setUploadProgress((prev) =>
              prev.map((p) =>
                p.filename === file.name
                  ? {
                      ...p,
                      progress,
                      status:
                        progress >= 100
                          ? ("complete" as const)
                          : ("uploading" as const),
                      currentStep:
                        progress >= 100
                          ? "Complete"
                          : `Uploading (${progress}%)`,
                    }
                  : p
              )
            );
          },
          onSuccess: (file: File) => {
            setUploadProgress((prev) =>
              prev.map((p) =>
                p.filename === file.name
                  ? {
                      ...p,
                      progress: 100,
                      status: "complete" as const,
                      currentStep: "Complete",
                    }
                  : p
              )
            );
          },
          onError: (file: File, error: Error) => {
            setUploadProgress((prev) =>
              prev.map((p) =>
                p.filename === file.name
                  ? {
                      ...p,
                      status: "error" as const,
                      currentStep: "Failed",
                      error: error.message,
                    }
                  : p
              )
            );
          },
        };

        // Reuse our parallel upload implementation from handleFileUploadProgress
        await handleFileUploadProgress(files, progressTracker);
      } catch (error) {
        console.error("Error in image upload process:", error);

        setUploadProgress((prev) =>
          prev.map((p) => ({
            ...p,
            status: "error",
            currentStep: "Upload failed",
            error:
              error instanceof Error
                ? error.message
                : "Failed to upload images",
          }))
        );

        toast.error("Upload Failed", {
          description:
            error instanceof Error ? error.message : "Failed to upload images",
        });
      }
    },
    [carId, handleFileUploadProgress]
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
            onSetPrimary={(image) => handlePrimaryImageChange(image._id)}
            onUpload={handleImageUpload}
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
              maxSize={1024 * 1024 * 5} // 5MB
              accept="image/*"
              onUpload={handleFileUploadProgress}
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
              <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4">
                {uploadProgress.length > 0 ? (
                  uploadProgress.map((progress) => (
                    <div key={progress.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">
                          {progress.filename}
                        </span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {progress.status === "error" ? (
                            <span className="text-destructive">Error</span>
                          ) : progress.status === "complete" ? (
                            <span className="text-success">Complete</span>
                          ) : (
                            `${Math.round(progress.progress)}%`
                          )}
                        </span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-200",
                            progress.status === "error"
                              ? "bg-destructive"
                              : progress.status === "complete"
                                ? "bg-success"
                                : "bg-primary"
                          )}
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {progress.currentStep}
                      </div>
                      {progress.error && (
                        <div className="text-xs text-destructive mt-1">
                          {progress.error}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <FileUpload.List />
                )}
              </div>
            </FileUpload.Root>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
