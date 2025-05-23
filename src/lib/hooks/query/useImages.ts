import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { getFormattedImageUrl, getPlaceholderImageUrl } from "@/lib/cloudflare";

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
        const response = await fetch(`/api/cars/${carId}/images?limit=500`);

        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }

        const data = await response.json();

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
        formData.append("file", file);
        formData.append("carId", carId);

        if (vehicleInfo) {
          formData.append("vehicleInfo", JSON.stringify(vehicleInfo));
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
          const response = await fetch(`/api/cloudflare/images`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }

          const result = await response.json();

          // Add the new image to our uploadedImages array
          uploadedImages.push(result.image);

          progress[i] = {
            ...progress[i],
            progress: 100,
            status: "complete",
            imageUrl: result.image.url,
            metadata: result.image.metadata,
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
      // Update the cache with the new images
      queryClient.setQueryData(
        ["carImages", carId],
        (old: ImageType[] = []) => {
          // Filter out any duplicates and merge with existing images
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

        // Use a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

        try {
          // Attempt to delete using the cars API endpoint
          const response = await fetch(
            `/api/cars/${carId}/images?t=${timestamp}&cb=${cacheBuster}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "X-User-Initiated": "true",
                "X-Request-Time": timestamp.toString(),
                "X-Request-ID": batchId,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Error deleting images:", {
              status: response.status,
              statusText: response.statusText,
              data: errorData,
            });

            throw new Error(
              `Failed to delete images (${response.status}): ${
                errorData.error || response.statusText
              }`
            );
          }

          // Parse response
          const data = await response.json();
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
      const response = await fetch(`/api/cars/${carId}/thumbnail`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryImageId: imageId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to set primary image");
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate car query to update the primary image
      queryClient.invalidateQueries({ queryKey: ["car", carId] });
    },
  });
}
