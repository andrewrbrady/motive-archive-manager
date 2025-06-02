import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { getFormattedImageUrl, getPlaceholderImageUrl } from "@/lib/cloudflare";
import { api } from "@/lib/api-client";

export interface ImageMetadata {
  angle?: string;
  description?: string;
  movement?: string;
  tod?: string;
  view?: string;
  side?: string;
  aiAnalysis?: {
    angle?: string;
    description?: string;
    movement?: string;
    tod?: string;
    view?: string;
    side?: string;
  };
}

export interface ImageType {
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

export interface ImageProgress {
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

/**
 * Fetch all images for a car
 */
export function useCarImages(carId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["carImages", carId],
    queryFn: async () => {
      try {
        // Use only the dedicated images endpoint with pagination
        const data = await api.get<{ images: any[] }>(
          `/cars/${carId}/images?limit=500`
        );

        // If we have images from the images endpoint, return them
        if (
          data.images &&
          Array.isArray(data.images) &&
          data.images.length > 0
        ) {
          return data.images.map((image: any) => ({
            ...image,
            id: image.id || image._id,
            _id: image._id || image.id,
          }));
        }

        // Handle empty array case
        if (
          data.images &&
          Array.isArray(data.images) &&
          data.images.length === 0
        ) {
          return [];
        }

        // No images found or response structure was incorrect
        return [];
      } catch (error) {
        console.error("Error fetching car images:", error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Upload images mutation
 */
export function useUploadImages(carId: string, vehicleInfo?: any) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      files,
      onProgress,
    }: {
      files: File[];
      onProgress?: (progress: ImageProgress[]) => void;
    }) => {
      const uploadedImages: ImageType[] = [];
      const progress: ImageProgress[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("files", file);
        formData.append("carId", carId);

        if (vehicleInfo) {
          formData.append("metadata", JSON.stringify(vehicleInfo));
        }

        // Create progress tracking object with detailed step tracking
        progress.push({
          fileName: file.name,
          progress: 0,
          status: "uploading",
          currentStep: "Uploading to Cloudflare...",
          stepProgress: {
            cloudflare: {
              status: "uploading",
              progress: 0,
              message: "Starting Cloudflare upload...",
            },
            openai: {
              status: "pending",
              progress: 0,
              message: "Waiting for Cloudflare upload to complete",
            },
          },
        });

        if (onProgress) {
          onProgress([...progress]);
        }

        try {
          const response = await fetch("/api/images/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Upload failed: ${response.statusText}`
            );
          }

          const data = await response.json();

          if (!data.success || !data.images || data.images.length === 0) {
            throw new Error(
              data.error || "No images were uploaded successfully"
            );
          }

          const uploadedImage = data.images[0];
          let imageUrl = uploadedImage.url;

          if (
            imageUrl &&
            imageUrl.includes("imagedelivery.net") &&
            !imageUrl.match(
              /\/(public|thumbnail|avatar|medium|large|webp|preview|original|w=\d+)$/
            )
          ) {
            imageUrl = `${imageUrl}/w=200,h=200,fit=cover`;
          }

          // Create ImageType object matching expected format
          const processedImage: ImageType = {
            id: uploadedImage._id || uploadedImage.id,
            url: imageUrl,
            filename: uploadedImage.filename || file.name,
            metadata: uploadedImage.metadata || {},
            variants: uploadedImage.variants || {},
            createdAt: uploadedImage.createdAt || new Date().toISOString(),
            updatedAt: uploadedImage.updatedAt || new Date().toISOString(),
          };

          uploadedImages.push(processedImage);

          progress[i] = {
            ...progress[i],
            progress: 100,
            status: "complete",
            imageUrl: imageUrl,
            metadata: processedImage.metadata,
            stepProgress: {
              cloudflare: {
                status: "complete",
                progress: 100,
                message: "Upload complete",
              },
              openai: {
                status: "complete",
                progress: 100,
                message: "Analysis complete",
              },
            },
          };

          if (onProgress) {
            onProgress([...progress]);
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          progress[i] = {
            ...progress[i],
            status: "error",
            error: error instanceof Error ? error.message : "Upload failed",
            stepProgress: {
              cloudflare: {
                status: "error",
                progress: 0,
                message: "Upload failed",
              },
              openai: {
                status: "error",
                progress: 0,
                message: "Analysis failed",
              },
            },
          };
          if (onProgress) {
            onProgress([...progress]);
          }
          throw error;
        }
      }

      return uploadedImages;
    },
    onSuccess: (newImages) => {
      queryClient.setQueryData(
        ["carImages", carId],
        (old: ImageType[] = []) => {
          const existingIds = new Set(old.map((img) => img.id));
          const uniqueNewImages = newImages.filter(
            (img) => !existingIds.has(img.id)
          );
          return [...old, ...uniqueNewImages];
        }
      );
    },
  });
}

/**
 * Delete images mutation
 */
export const useDeleteImages = (carId: string, queryClient: QueryClient) => {
  return useMutation({
    mutationKey: ["deleteImages", carId],
    mutationFn: async ({
      imageIds,
      cloudflareIds = [],
      deleteFromStorage = false,
    }: {
      imageIds: string[];
      cloudflareIds?: string[];
      deleteFromStorage?: boolean;
    }) => {
      // [REMOVED] // [REMOVED] console.log(`Deleting ${imageIds.length} images (MongoDB IDs)`, imageIds);

      // If cloudflareIds array is empty, use the imageIds array as-is
      // If it's provided, use that specific array for deletion from storage
      const effectiveCloudflareIds =
        cloudflareIds.length > 0 ? cloudflareIds : [];

      console.log(
        `Cloudflare IDs: ${effectiveCloudflareIds.length}`,
        effectiveCloudflareIds
      );

      // Add timestamp and cache buster to help prevent caching issues
      const timestamp = Date.now();
      const cacheBuster = Math.random().toString(36).substring(2, 15);

      // Create unique toast ID for this deletion batch
      const batchId = Math.random().toString(36).substring(2, 10);

      try {
        // Create the payload - keep both arrays separate
        // The backend will handle the proper ID usage for each operation
        const payload = {
          imageIds: imageIds,
          cloudflareIds: effectiveCloudflareIds,
          deleteFromStorage,
          isUserInitiated: true,
        };

        // [REMOVED] // [REMOVED] console.log("Sending deletion payload:", payload);

        try {
          // Use the API client for authenticated deletion
          const data = await api.deleteWithBody(
            `/cars/${carId}/images?t=${timestamp}&cb=${cacheBuster}`,
            payload,
            {
              headers: {
                "X-User-Initiated": "true",
                "X-Request-Time": timestamp.toString(),
                "X-Request-ID": batchId,
              },
            }
          );

          // [REMOVED] // [REMOVED] console.log("Delete successful:", data);
          return data;
        } catch (error) {
          console.error("Error in delete operation:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error in delete mutation:", error);
        throw error;
      }
    },
    onMutate: async ({ imageIds }) => {
      // Cancel any outgoing queries for images
      await queryClient.cancelQueries({ queryKey: ["carImages", carId] });

      // Get snapshot of current images
      const prevImages = queryClient.getQueryData<{ images: any[] }>([
        "carImages",
        carId,
      ]);

      // Optimistically update the cache
      // We need to compare string versions of the IDs to handle both ObjectId strings and frontend UUIDs
      if (prevImages?.images) {
        queryClient.setQueryData(["carImages", carId], {
          ...prevImages,
          images: prevImages.images.filter(
            (image) =>
              !imageIds.includes(image._id) && !imageIds.includes(image.id)
          ),
        });
      }

      // Return context to use in case of rollback
      return { prevImages };
    },
    onError: (err, variables, context) => {
      console.error("Delete images error with rollback:", err);
      // Revert to previous state if available
      if (context?.prevImages) {
        queryClient.setQueryData(["carImages", carId], context.prevImages);
      }
    },
    onSettled: () => {
      // Invalidate the images query to refetch the latest data
      queryClient.invalidateQueries({ queryKey: ["carImages", carId] });
    },
  });
};

/**
 * Set primary image mutation
 */
export function useSetPrimaryImage(carId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      return await api.put(`/cars/${carId}/thumbnail`, {
        primaryImageId: imageId,
      });
    },
    onSuccess: () => {
      // Invalidate car query to update the primary image
      queryClient.invalidateQueries({ queryKey: ["car", carId] });
    },
  });
}
