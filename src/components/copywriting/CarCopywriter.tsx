"use client";

import React from "react";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { toast } from "@/components/ui/use-toast";
import { useAPI } from "@/hooks/useAPI";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BaseCopywriter,
  CopywriterConfig,
  CopywriterCallbacks,
  CopywriterData,
} from "./BaseCopywriter";
import type { BaTCarDetails } from "@/types/car-page";
import type {
  ProjectCar,
  ProjectEvent,
} from "../projects/caption-generator/types";

interface CarCopywriterProps {
  carId: string;
}

/**
 * CarCopywriter - Non-blocking copywriter for individual cars
 * Part of Phase 3F optimization - uses useAPIQuery for all data fetching
 * Users can switch tabs while data loads in background
 */
export function CarCopywriter({ carId }: CarCopywriterProps) {
  const api = useAPI();

  // Use optimized query hook for car data with galleries - non-blocking, cached
  const {
    data: carData,
    isLoading: isLoadingCar,
    error: carError,
  } = useAPIQuery<any>(`cars/${carId}?includeGalleries=true`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Use optimized query hook for events - non-blocking, cached
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useAPIQuery<any[]>(`cars/${carId}/events?limit=6`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Use optimized query hook for saved captions - non-blocking, cached
  const {
    data: captionsData,
    isLoading: isLoadingCaptions,
    error: captionsError,
    refetch: refetchCaptions,
  } = useAPIQuery<any[]>(`captions?carId=${carId}&limit=4&sort=-createdAt`, {
    staleTime: 1 * 60 * 1000, // 1 minute cache for user data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Process gallery images when car data changes
  const [galleryImages, setGalleryImages] = React.useState<any[]>([]);

  React.useEffect(() => {
    const processGalleryImages = async () => {
      if (!carData?.galleries || carData.galleries.length === 0) {
        setGalleryImages([]);
        return;
      }

      const galleries = carData.galleries;
      console.log("🖼️ CarCopywriter: Processing car galleries data:", {
        galleriesCount: galleries.length,
        galleries: galleries.map((g: any) => ({
          id: g._id,
          name: g.name,
          imageCount: g.imageIds?.length || 0,
        })),
      });

      // Collect all image IDs from all galleries
      const allImageIds = galleries.flatMap((gallery: any) => {
        return gallery.imageIds || [];
      });
      console.log("🖼️ CarCopywriter: Collected image IDs from car galleries:", {
        totalImageIds: allImageIds.length,
        imageIds: allImageIds.slice(0, 5), // Show first 5 IDs
      });

      if (allImageIds.length === 0) {
        setGalleryImages([]);
        return;
      }

      try {
        if (!api) {
          console.warn(
            "🖼️ CarCopywriter: API not available, skipping gallery images fetch"
          );
          return;
        }

        // Fetch images metadata using the images metadata API
        const imageMetadataResponse = await api.get(
          `images/metadata?ids=${allImageIds.join(",")}`
        );

        console.log("🖼️ CarCopywriter: Raw image metadata API response:", {
          responseType: typeof imageMetadataResponse,
          isArray: Array.isArray(imageMetadataResponse),
          length: Array.isArray(imageMetadataResponse)
            ? imageMetadataResponse.length
            : 0,
          requestedImageIds: allImageIds,
          requestedImageIdsCount: allImageIds.length,
        });

        // Process and format the image metadata
        if (Array.isArray(imageMetadataResponse)) {
          const processedImages = imageMetadataResponse.map((img) => ({
            id: img.imageId,
            url: img.url,
            filename: img.filename,
            metadata: {
              ...img.metadata,
              // Ensure all metadata fields are available
              angle: img.metadata?.angle || null,
              view: img.metadata?.view || null,
              movement: img.metadata?.movement || null,
              tod: img.metadata?.tod || null,
              side: img.metadata?.side || null,
              description: img.metadata?.description || null,
              category: img.metadata?.category || null,
              isPrimary: img.metadata?.isPrimary || false,
            },
            galleryName:
              galleries.find((g: any) => g.imageIds?.includes(img.imageId))
                ?.name || "",
          }));

          setGalleryImages(processedImages);

          console.log("🖼️ CarCopywriter: Processed car gallery images:", {
            galleryImagesCount: processedImages.length,
            sampleProcessedImage: processedImages[0],
          });
        }
      } catch (error) {
        console.warn(
          "🖼️ CarCopywriter: Failed to fetch car gallery images metadata:",
          error
        );
        setGalleryImages([]);
      }
    };

    processGalleryImages();
  }, [carData, api]);

  // Determine overall loading state - only entity-specific data
  const isLoading = isLoadingCar || isLoadingEvents;
  const hasError = carError || eventsError || captionsError;

  // Show non-blocking loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading car copywriter...
          </p>
          <p className="text-xs text-muted-foreground text-center">
            You can switch tabs while this loads
          </p>
        </div>
      </div>
    );
  }

  // Show non-blocking error state
  if (hasError && !carData) {
    return (
      <div className="py-8">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-4 max-w-md mx-auto">
          <p className="text-destructive text-sm text-center mb-3">
            Failed to load car copywriter data. Tab switching is still
            available.
          </p>
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!api || !carData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  const config: CopywriterConfig = {
    mode: "car",
    entityId: carId,
    title: "Car Copywriter",
    apiEndpoints: {
      captions: `captions`,
      systemPrompts: `system-prompts/active`,
      events: `cars/${carId}/events`,
      galleries: `cars/${carId}?includeGalleries=true`,
    },
    features: {
      allowMultipleCars: false,
      allowEventSelection: true,
      allowMinimalCarData: false,
      showClientHandle: true,
      allowGallerySelection: true,
    },
  };

  const callbacks: CopywriterCallbacks = {
    onDataFetch: async (): Promise<CopywriterData> => {
      try {
        // Convert to project car format
        const projectCar: ProjectCar = {
          _id: carData._id,
          year: carData.year || 0,
          make: carData.make || "",
          model: carData.model || "",
          color: carData.color,
          vin: carData.vin,
          status: carData.status || "available",
          primaryImageId: carData.primaryImageId,
          createdAt: new Date().toISOString(),
          engine: carData.engine,
          transmission: carData.transmission,
          dimensions: carData.dimensions,
          manufacturing: carData.manufacturing,
          performance: carData.performance,
          interior_features: carData.interior_features,
          interior_color: carData.interior_color,
          condition: carData.condition,
          location: carData.location,
          doors: carData.doors,
          safety: carData.safety,
          description: carData.description,
          mileage: carData.mileage,
        };

        // Convert events to project format
        const events = eventsData || [];
        const hasMoreEventsAvailable = events.length > 5;
        const eventsToDisplay = events.slice(0, 5);

        const projectEvents: ProjectEvent[] = eventsToDisplay
          .filter((event: any) => {
            if (!event.id) {
              console.warn("🚨 Event without ID found:", event);
              return false;
            }
            return true;
          })
          .map((event: any) => ({
            id: event.id,
            car_id: carId,
            type: event.type,
            title: event.title,
            description: event.description || "",
            start: event.start,
            end: event.end,
            isAllDay: event.isAllDay,
            teamMemberIds: event.teamMemberIds || [],
            locationId: event.locationId,
            primaryImageId: event.primaryImageId,
            imageIds: event.imageIds || [],
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
          }));

        // Process captions
        const captions = captionsData || [];
        const hasMoreCaptionsAvailable = captions.length > 3;
        const captionsToDisplay = captions.slice(0, 3);

        const savedCaptions = captionsToDisplay.map((caption: any) => ({
          _id: caption._id,
          platform: caption.platform,
          context: caption.context,
          caption: caption.caption,
          projectId: "",
          carIds: [caption.carId],
          eventIds: [],
          createdAt: caption.createdAt,
        }));

        // Use galleries from car data
        const galleries = carData?.galleries || [];

        return {
          cars: [projectCar],
          models: [], // Empty array for models - not applicable for single car copywriter
          events: projectEvents,
          galleries, // Use car galleries
          galleryImages, // Use processed gallery images from state
          systemPrompts: [], // Now handled by shared cache in BaseCopywriter
          lengthSettings: [], // Now handled by shared cache in BaseCopywriter
          savedCaptions: savedCaptions,
          clientHandle: null, // TODO: Implement client handle fetching if needed
          hasMoreEvents: hasMoreEventsAvailable,
          hasMoreCaptions: hasMoreCaptionsAvailable,
          hasMoreGalleries: false, // Gallery pagination not implemented for cars
        };
      } catch (error) {
        console.error("Error processing car copywriter data:", error);
        throw error;
      }
    },

    onSaveCaption: async (captionData: any): Promise<boolean> => {
      // Phase 3C FIX: Remove blocking await from background operations
      const saveOperation = () => {
        api
          .post("captions", {
            platform: captionData.platform,
            carId: carId,
            context: captionData.context,
            caption: captionData.caption,
          })
          .then(() => {
            toast({
              title: "Success",
              description: "Caption saved successfully",
            });

            // Refresh captions in background - non-blocking
            setTimeout(() => {
              refetchCaptions().catch((error) => {
                console.error("Error refreshing captions:", error);
              });
            }, 100);
          })
          .catch((error) => {
            console.error("Error saving caption:", error);
            toast({
              title: "Error",
              description: "Failed to save caption",
              variant: "destructive",
            });
          });
      };

      // Execute save operation in background - truly non-blocking
      setTimeout(saveOperation, 0);

      // Return immediately with optimistic success
      toast({
        title: "Saving...",
        description: "Caption is being saved in background",
      });
      return true;
    },

    onDeleteCaption: async (captionId: string): Promise<boolean> => {
      // Phase 3C FIX: Remove blocking await from background operations
      const deleteOperation = () => {
        api
          .delete(`captions?id=${captionId}&carId=${carId}`)
          .then(() => {
            toast({
              title: "Success",
              description: "Caption deleted successfully",
            });

            // Refresh captions in background - non-blocking
            setTimeout(() => {
              refetchCaptions().catch((error) => {
                console.error("Error refreshing captions:", error);
              });
            }, 100);
          })
          .catch((error) => {
            console.error("Error deleting caption:", error);
            toast({
              title: "Error",
              description: "Failed to delete caption",
              variant: "destructive",
            });
          });
      };

      // Execute delete operation in background - truly non-blocking
      setTimeout(deleteOperation, 0);

      // Return immediately with optimistic success
      toast({
        title: "Deleting...",
        description: "Caption is being deleted in background",
      });
      return true;
    },

    onUpdateCaption: async (
      captionId: string,
      newText: string
    ): Promise<boolean> => {
      try {
        toast({
          title: "Updating...",
          description: "Saving caption changes...",
        });

        // Wait for the update to complete - using the new endpoint format
        await api.patch(`captions/${captionId}`, {
          caption: newText,
        });

        toast({
          title: "Success",
          description: "Caption updated successfully",
        });

        // Refresh captions after successful update
        try {
          await refetchCaptions();
        } catch (error) {
          console.error("Error refreshing captions:", error);
        }

        return true;
      } catch (error) {
        console.error("Error updating caption:", error);
        toast({
          title: "Error",
          description: "Failed to update caption",
          variant: "destructive",
        });
        return false;
      }
    },

    onRefresh: async (): Promise<void> => {
      // Phase 3C FIX: Make refresh non-blocking
      refetchCaptions().catch((error) => {
        console.error("Error refreshing captions:", error);
      });
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
