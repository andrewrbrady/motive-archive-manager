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

        // Call onProgress callback
        if (onProgress) {
          onProgress([...progress]);
        }

        try {
          // Update to show progress at 25% during Cloudflare upload
          progress[i] = {
            ...progress[i],
            progress: 25,
            stepProgress: {
              cloudflare: {
                status: "uploading",
                progress: 50,
                message: "Uploading to Cloudflare...",
              },
              openai: {
                status: "pending",
                progress: 0,
                message: "Waiting for Cloudflare upload to complete",
              },
            },
          };

          // Call onProgress callback
          if (onProgress) {
            onProgress([...progress]);
          }

          const response = await fetch(`/api/cloudflare/images`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }

          // Parse the initial response
          const result = await response.json();

          // Update progress to show Cloudflare completed and OpenAI starting
          progress[i] = {
            ...progress[i],
            progress: 50,
            currentStep: "Analyzing image with OpenAI...",
            stepProgress: {
              cloudflare: {
                status: "complete",
                progress: 100,
                message: "Cloudflare upload complete",
              },
              openai: {
                status: "analyzing" as const,
                progress: 0,
                message: "Starting AI analysis...",
              },
            },
          };

          // Call onProgress callback
          if (onProgress) {
            onProgress([...progress]);
          }

          // Start polling for status
          const imageId =
            result.result?.id || result.imageId || result.cloudflareId;
          if (imageId) {
            let isProcessComplete = false;
            let iterations = 0;
            const maxIterations = 20; // Max attempts to avoid infinite loops

            while (!isProcessComplete && iterations < maxIterations) {
              // Wait 1 second between polls
              await new Promise((resolve) => setTimeout(resolve, 1000));
              iterations++;

              // Update OpenAI progress based on iterations (approximate)
              const openAiProgress = Math.min(
                iterations * 15, // 15% per iteration
                90 // Cap at 90% until we get "complete" signal
              );

              progress[i] = {
                ...progress[i],
                progress: 50 + openAiProgress / 2, // Map 0-100 to 50-100
                stepProgress: {
                  cloudflare: {
                    status: "complete",
                    progress: 100,
                    message: "Cloudflare upload complete",
                  },
                  openai: {
                    status: "analyzing" as const,
                    progress: openAiProgress,
                    message: `Analyzing image (step ${iterations})...`,
                  },
                },
              };

              // Call onProgress callback
              if (onProgress) {
                onProgress([...progress]);
              }

              // Check status
              try {
                console.log(
                  `Checking status for image ${imageId}, iteration ${iterations}`
                );
                const statusResponse = await fetch(
                  `/api/cloudflare/images/status`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ id: imageId }),
                  }
                );

                if (statusResponse.ok) {
                  // Parse status response
                  const statusResult = await statusResponse.json();
                  console.log("Status result:", statusResult);

                  // If status is "processing", update the progress message
                  if (statusResult.status === "processing") {
                    progress[i] = {
                      ...progress[i],
                      progress: 50 + openAiProgress / 2, // Map 0-100 to 50-100
                      currentStep: "OpenAI analysis in progress...",
                      stepProgress: {
                        cloudflare: {
                          status: "complete",
                          progress: 100,
                          message: "Cloudflare upload complete",
                        },
                        openai: {
                          status: "analyzing" as const,
                          progress: openAiProgress,
                          message: `AI analysis in progress (${Math.min(
                            openAiProgress,
                            90
                          )}%)...`,
                        },
                      },
                    };

                    // Call onProgress callback
                    if (onProgress) {
                      onProgress([...progress]);
                    }
                  }

                  // If image has metadata from AI or has flags, consider it complete
                  if (
                    statusResult.ready ||
                    statusResult.status === "complete" ||
                    (statusResult.metadata &&
                      (statusResult.metadata.aiAnalysis?.angle ||
                        statusResult.metadata.aiAnalysis?.description ||
                        statusResult.metadata.angle ||
                        statusResult.metadata.description))
                  ) {
                    isProcessComplete = true;

                    // Push the uploaded image to our results
                    uploadedImages.push({
                      id: imageId,
                      url:
                        result.result?.variants?.[0] ||
                        result.imageUrl ||
                        result.success?.variants?.[0],
                      filename: file.name,
                      metadata: statusResult.metadata || {},
                      variants:
                        result.result?.variants ||
                        result.success?.variants ||
                        {},
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });

                    // Update progress to complete
                    progress[i] = {
                      ...progress[i],
                      progress: 100,
                      status: "complete",
                      currentStep: "Upload and analysis complete",
                      stepProgress: {
                        cloudflare: {
                          status: "complete",
                          progress: 100,
                          message: "Upload to Cloudflare complete",
                        },
                        openai: {
                          status: "complete",
                          progress: 100,
                          message: "AI analysis complete",
                        },
                      },
                    };

                    // Call onProgress callback
                    if (onProgress) {
                      onProgress([...progress]);
                    }
                  }
                }
              } catch (e) {
                console.error("Error checking status:", e);
              }
            }

            // If we hit max iterations without completion, still mark as completed
            // but indicate that analysis might not be complete
            if (!isProcessComplete) {
              console.log("Hit max iterations, marking as complete anyway");
              progress[i] = {
                ...progress[i],
                progress: 100,
                status: "complete",
                currentStep:
                  "Upload complete, analysis may still be processing",
                stepProgress: {
                  cloudflare: {
                    status: "complete",
                    progress: 100,
                    message: "Upload to Cloudflare complete",
                  },
                  openai: {
                    status: "complete",
                    progress: 100,
                    message: "Analysis timeout, but image is uploaded",
                  },
                },
              };

              // Call onProgress callback with a slight delay to ensure UI updates
              if (onProgress) {
                // First update immediately
                onProgress([...progress]);

                // Then update again after a slight delay for UI consistency
                setTimeout(() => {
                  onProgress([...progress]);
                }, 500);
              }
            }
          }
        } catch (error) {
          console.error(`Error uploading image ${file.name}:`, error);
          // Update progress to show error
          progress[i] = {
            ...progress[i],
            status: "error",
            progress: 0,
            error: error instanceof Error ? error.message : "Unknown error",
            stepProgress: {
              cloudflare: {
                status: "error",
                progress: 0,
                message: "Upload failed",
              },
              openai: {
                status: "pending",
                progress: 0,
                message: "Upload failed before analysis could begin",
              },
            },
          };

          // Call onProgress callback
          if (onProgress) {
            onProgress([...progress]);
          }
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["carImages", carId] });

      return {
        uploadedImages,
        progress,
      };
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
      console.log(`Deleting ${imageIds.length} images (MongoDB IDs)`, imageIds);

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

        console.log("Sending deletion payload:", payload);

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
          console.log("Delete successful:", data);
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
