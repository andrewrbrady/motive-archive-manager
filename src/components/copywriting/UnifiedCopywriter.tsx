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

interface UnifiedCopywriterProps {
  // Core configuration
  title?: string;

  // Entity configuration - can be single car or project
  carIds?: string[]; // For multiple cars (project mode)
  carId?: string; // For single car (car detail page)
  projectId?: string; // For project-specific data

  // Feature flags
  allowMultipleCars?: boolean;
  allowEventSelection?: boolean;
  allowMinimalCarData?: boolean;
  showClientHandle?: boolean;

  // Callbacks for parent components
  onProjectUpdate?: () => void;

  // SSR optimization - optional pre-fetched data
  initialCopywriterData?: {
    cars: BaTCarDetails[];
    models?: any[];
    events: any[];
    captions: any[];
  };
}

/**
 * UnifiedCopywriter - One copywriter to rule them all!
 *
 * This component can handle:
 * - Single car copywriting (car detail pages)
 * - Multiple car copywriting (project pages)
 * - Any combination of cars and events
 *
 * Usage Examples:
 *
 * // Single car on /cars/[id] page
 * <UnifiedCopywriter carId="123" showClientHandle={true} />
 *
 * // Multiple cars on /projects/[id] page
 * <UnifiedCopywriter
 *   carIds={["123", "456", "789"]}
 *   projectId="proj-1"
 *   allowMultipleCars={true}
 *   allowMinimalCarData={true}
 * />
 *
 * // Custom configuration
 * <UnifiedCopywriter
 *   carIds={["123", "456"]}
 *   title="Custom Copywriter"
 *   allowEventSelection={false}
 * />
 */
export function UnifiedCopywriter({
  title,
  carIds = [],
  carId,
  projectId,
  allowMultipleCars = false,
  allowEventSelection = true,
  allowMinimalCarData = false,
  showClientHandle = false,
  onProjectUpdate,
  initialCopywriterData,
}: UnifiedCopywriterProps) {
  const api = useAPI();

  // Normalize input: convert single carId to carIds array
  const normalizedCarIds = React.useMemo(() => {
    if (carId) return [carId];
    return carIds;
  }, [carId, carIds]);

  // Auto-detect mode based on props
  const mode = projectId ? "project" : "car";
  const entityId = projectId || normalizedCarIds[0] || "";

  // Auto-configure features based on usage
  const features = {
    allowMultipleCars: allowMultipleCars || normalizedCarIds.length > 1,
    allowEventSelection,
    allowMinimalCarData,
    showClientHandle,
    allowGallerySelection: !!projectId, // Only enable for project mode
  };

  // Smart endpoint configuration
  const apiEndpoints = React.useMemo(() => {
    if (projectId) {
      return {
        captions: `/api/projects/${projectId}/captions`,
        systemPrompts: `system-prompts/active`,
        events: `/api/projects/${projectId}/events?includeCars=true`,
        galleries: `/api/projects/${projectId}/galleries`,
      };
    } else {
      const primaryCarId = normalizedCarIds[0];
      return {
        captions: `captions`,
        systemPrompts: `system-prompts/active`,
        events: primaryCarId ? `cars/${primaryCarId}/events` : undefined,
        galleries: undefined,
      };
    }
  }, [projectId, normalizedCarIds]);

  // Car data fetching - handle both project and car modes
  const carsEndpoint = React.useMemo(() => {
    if (projectId && normalizedCarIds.length === 0) {
      // Project mode without specific carIds - fetch all project cars
      return `projects/${projectId}/cars`;
    } else if (normalizedCarIds.length === 1) {
      // Single car mode
      return `cars/${normalizedCarIds[0]}`;
    } else if (normalizedCarIds.length > 1) {
      // Multiple specific cars
      return `cars/batch?ids=${normalizedCarIds.join(",")}`;
    }
    return null;
  }, [projectId, normalizedCarIds]);

  const {
    data: carsData,
    isLoading: isLoadingCars,
    error: carsError,
  } = useAPIQuery<BaTCarDetails[]>(carsEndpoint!, {
    enabled: !!carsEndpoint && !initialCopywriterData?.cars, // Don't fetch if we have initial data
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    // Transform response to array format
    select: (data: any) => {
      console.log(
        `🚗 UnifiedCopywriter: Raw API response for ${carsEndpoint}:`,
        data
      );

      if (projectId && normalizedCarIds.length === 0) {
        // Project cars response - API returns {cars: [...]}
        const result = Array.isArray(data?.cars) ? data.cars : [];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 UnifiedCopywriter: Project cars parsed:`, result);
        return result;
      } else if (normalizedCarIds.length === 1) {
        // Single car response
        const result = [data];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 UnifiedCopywriter: Single car parsed:`, result);
        return result;
      } else {
        // Batch cars response
        const result = Array.isArray(data) ? data : data?.cars || [];
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 UnifiedCopywriter: Batch cars parsed:`, result);
        return result;
      }
    },
  });

  // For project mode, fetch full car details since project cars API only returns basic info
  const projectCarIds = React.useMemo(() => {
    if (projectId && carsData && carsData.length > 0) {
      return carsData
        .map((car) => car._id)
        .filter((id): id is string => Boolean(id));
    }
    return [];
  }, [projectId, carsData]);

  // Build the endpoint for full car details
  const fullCarsEndpoint = React.useMemo(() => {
    if (projectCarIds.length > 1) {
      return `cars/batch?ids=${projectCarIds.join(",")}`;
    } else if (projectCarIds.length === 1) {
      return `cars/${projectCarIds[0]}`;
    }
    return null;
  }, [projectCarIds]);

  const {
    data: fullCarsData,
    isLoading: isLoadingFullCars,
    error: fullCarsError,
  } = useAPIQuery<BaTCarDetails[]>(fullCarsEndpoint!, {
    enabled: Boolean(
      projectId &&
        projectCarIds.length > 0 &&
        fullCarsEndpoint &&
        !initialCopywriterData?.cars
    ), // Don't fetch if we have initial data
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    select: (data: any) => {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🔧 UnifiedCopywriter: Full car details response:`, data);
      if (projectCarIds.length === 1) {
        return [data];
      } else {
        return Array.isArray(data) ? data : data?.cars || [];
      }
    },
  });

  // Use full car data if available (project mode), otherwise use basic car data
  // Prioritize initial data from SSR optimization
  const finalCarsData = React.useMemo(() => {
    // First priority: Use pre-loaded data from SSR
    if (initialCopywriterData?.cars && initialCopywriterData.cars.length > 0) {
      console.log(
        `✅ UnifiedCopywriter: Using pre-loaded SSR car data:`,
        initialCopywriterData.cars.length,
        "cars"
      );
      return initialCopywriterData.cars;
    }

    // Second priority: Use full car data (project mode)
    if (projectId && fullCarsData && fullCarsData.length > 0) {
      console.log(
        `🚗 UnifiedCopywriter: Using full car data for project mode:`,
        fullCarsData
      );
      return fullCarsData;
    }

    // Fallback: Use basic car data
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`🚗 UnifiedCopywriter: Using basic car data:`, carsData || []);
    return carsData || [];
  }, [initialCopywriterData?.cars, projectId, fullCarsData, carsData]);

  // Models data fetching (only for project mode)
  const modelsEndpoint = React.useMemo(() => {
    if (projectId) {
      return `projects/${projectId}/models`;
    }
    return null;
  }, [projectId]);

  const {
    data: modelsData,
    isLoading: isLoadingModels,
    error: modelsError,
  } = useAPIQuery<any[]>(modelsEndpoint!, {
    enabled: !!modelsEndpoint && !initialCopywriterData?.models, // Don't fetch if we have initial data
    staleTime: 3 * 60 * 1000,
    retry: 1, // Reduce retries to avoid spam for access denied errors
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    select: (data: any) => {
      console.log(
        `🏭 UnifiedCopywriter: Raw models API response for ${modelsEndpoint}:`,
        data
      );

      // Project models response - API returns {models: [...]}
      const result = Array.isArray(data?.models) ? data.models : [];
      console.log(`🏭 UnifiedCopywriter: Project models parsed:`, result);
      return result;
    },
  });

  // Handle models error gracefully
  React.useEffect(() => {
    if (modelsError) {
      // Handle access denied errors gracefully - don't show toast for 403/404
      if (
        (modelsError as any)?.status === 403 ||
        (modelsError as any)?.status === 404
      ) {
        console.warn(`Access denied to models endpoint: ${modelsEndpoint}`);
      } else {
        console.error(
          `Error fetching models from ${modelsEndpoint}:`,
          modelsError
        );
      }
    }
  }, [modelsError, modelsEndpoint]);

  // Events data fetching
  const eventsEndpoint = apiEndpoints.events;
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useAPIQuery<any[]>(eventsEndpoint!, {
    enabled:
      !!eventsEndpoint && allowEventSelection && !initialCopywriterData?.events, // Don't fetch if we have initial data
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Captions data fetching
  const captionsQuery = projectId
    ? `projects/${projectId}/captions`
    : `captions?carId=${normalizedCarIds[0]}&limit=4&sort=-createdAt`;

  const {
    data: captionsData,
    isLoading: isLoadingCaptions,
    error: captionsError,
    refetch: refetchCaptions,
  } = useAPIQuery<any[]>(captionsQuery, {
    enabled: !!captionsQuery && !initialCopywriterData?.captions, // Don't fetch if we have initial data
    staleTime: 1 * 60 * 1000,
    retry: 1, // Reduce retries to avoid spam for access denied errors
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Handle captions error gracefully
  React.useEffect(() => {
    if (captionsError) {
      // Handle access denied errors gracefully - don't show toast for 403/404
      if (
        (captionsError as any)?.status === 403 ||
        (captionsError as any)?.status === 404
      ) {
        console.warn(`Access denied to captions endpoint: ${captionsQuery}`);
      } else {
        console.error(
          `Error fetching captions from ${captionsQuery}:`,
          captionsError
        );
      }
    }
  }, [captionsError, captionsQuery]);

  // Galleries data fetching (only for project mode)
  const galleriesEndpoint = apiEndpoints.galleries;
  const {
    data: galleriesData,
    isLoading: isLoadingGalleries,
    error: galleriesError,
  } = useAPIQuery<{ galleries: any[] }>(galleriesEndpoint!, {
    enabled: !!galleriesEndpoint && !!projectId,
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Process gallery images when galleries data changes
  const [galleryImages, setGalleryImages] = React.useState<any[]>([]);

  React.useEffect(() => {
    const processGalleryImages = async () => {
      if (!galleriesData?.galleries || galleriesData.galleries.length === 0) {
        setGalleryImages([]);
        return;
      }

      const galleries = galleriesData.galleries;
      console.log("🖼️ UnifiedCopywriter: Processing galleries data:", {
        galleriesCount: galleries.length,
        galleries: galleries.map((g) => ({
          id: g._id,
          name: g.name,
          imageCount: g.imageIds?.length || 0,
        })),
      });

      // Collect all image IDs from all galleries
      console.log("🖼️ UnifiedCopywriter: Gallery structure:", galleries[0]);
      const allImageIds = galleries.flatMap((gallery) => {
        console.log(`🖼️ Gallery ${gallery.name} imageIds:`, gallery.imageIds);
        return gallery.imageIds || [];
      });
      console.log("🖼️ UnifiedCopywriter: Collected image IDs from galleries:", {
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
            "🖼️ UnifiedCopywriter: API not available, skipping gallery images fetch"
          );
          return;
        }

        // Fetch images metadata using the images metadata API
        const imageMetadataResponse = await api.get(
          `images/metadata?ids=${allImageIds.join(",")}`
        );

        // 🖼️ COMPREHENSIVE METADATA API DEBUGGING
        console.log("🖼️ UnifiedCopywriter: Raw image metadata API response:", {
          responseType: typeof imageMetadataResponse,
          isArray: Array.isArray(imageMetadataResponse),
          length: Array.isArray(imageMetadataResponse)
            ? imageMetadataResponse.length
            : 0,
          requestedImageIds: allImageIds,
          requestedImageIdsCount: allImageIds.length,
          firstFewRequestedIds: allImageIds.slice(0, 5),
        });

        // 🖼️ DETAILED RESPONSE STRUCTURE ANALYSIS
        if (
          Array.isArray(imageMetadataResponse) &&
          imageMetadataResponse.length > 0
        ) {
          const sampleImage = imageMetadataResponse[0];
          console.log(
            "🖼️ UnifiedCopywriter: Sample image metadata structure:",
            {
              sampleImageKeys: Object.keys(sampleImage),
              imageId: sampleImage.imageId,
              imageIdType: typeof sampleImage.imageId,
              hasMetadata: !!sampleImage.metadata,
              metadataKeys: sampleImage.metadata
                ? Object.keys(sampleImage.metadata)
                : [],
              metadataValues: sampleImage.metadata
                ? {
                    angle: sampleImage.metadata.angle,
                    view: sampleImage.metadata.view,
                    movement: sampleImage.metadata.movement,
                    tod: sampleImage.metadata.tod,
                    side: sampleImage.metadata.side,
                    description: sampleImage.metadata.description,
                    category: sampleImage.metadata.category,
                    isPrimary: sampleImage.metadata.isPrimary,
                  }
                : null,
              url: sampleImage.url,
              filename: sampleImage.filename,
            }
          );

          // 🖼️ METADATA FIELD ANALYSIS ACROSS ALL IMAGES
          const metadataFieldAnalysis = {
            totalImages: imageMetadataResponse.length,
            imagesWithMetadata: 0,
            fieldsPopulated: {
              angle: 0,
              view: 0,
              movement: 0,
              tod: 0,
              side: 0,
              description: 0,
              category: 0,
              isPrimary: 0,
            },
            sampleValues: {
              angles: new Set(),
              views: new Set(),
              movements: new Set(),
              tods: new Set(),
              sides: new Set(),
              categories: new Set(),
            },
          };

          imageMetadataResponse.forEach((img) => {
            if (img.metadata) {
              metadataFieldAnalysis.imagesWithMetadata++;

              if (img.metadata.angle) {
                metadataFieldAnalysis.fieldsPopulated.angle++;
                metadataFieldAnalysis.sampleValues.angles.add(
                  img.metadata.angle
                );
              }
              if (img.metadata.view) {
                metadataFieldAnalysis.fieldsPopulated.view++;
                metadataFieldAnalysis.sampleValues.views.add(img.metadata.view);
              }
              if (img.metadata.movement) {
                metadataFieldAnalysis.fieldsPopulated.movement++;
                metadataFieldAnalysis.sampleValues.movements.add(
                  img.metadata.movement
                );
              }
              if (img.metadata.tod) {
                metadataFieldAnalysis.fieldsPopulated.tod++;
                metadataFieldAnalysis.sampleValues.tods.add(img.metadata.tod);
              }
              if (img.metadata.side) {
                metadataFieldAnalysis.fieldsPopulated.side++;
                metadataFieldAnalysis.sampleValues.sides.add(img.metadata.side);
              }
              if (img.metadata.description) {
                metadataFieldAnalysis.fieldsPopulated.description++;
              }
              if (img.metadata.category) {
                metadataFieldAnalysis.fieldsPopulated.category++;
                metadataFieldAnalysis.sampleValues.categories.add(
                  img.metadata.category
                );
              }
              if (img.metadata.isPrimary) {
                metadataFieldAnalysis.fieldsPopulated.isPrimary++;
              }
            }
          });

          console.log("🖼️ UnifiedCopywriter: Metadata field analysis:", {
            ...metadataFieldAnalysis,
            sampleValues: {
              angles: Array.from(
                metadataFieldAnalysis.sampleValues.angles
              ).slice(0, 5),
              views: Array.from(metadataFieldAnalysis.sampleValues.views).slice(
                0,
                5
              ),
              movements: Array.from(
                metadataFieldAnalysis.sampleValues.movements
              ).slice(0, 5),
              tods: Array.from(metadataFieldAnalysis.sampleValues.tods).slice(
                0,
                5
              ),
              sides: Array.from(metadataFieldAnalysis.sampleValues.sides).slice(
                0,
                5
              ),
              categories: Array.from(
                metadataFieldAnalysis.sampleValues.categories
              ).slice(0, 5),
            },
          });
        }

        console.log("🖼️ UnifiedCopywriter: Image metadata response:", {
          responseType: typeof imageMetadataResponse,
          isArray: Array.isArray(imageMetadataResponse),
          length: Array.isArray(imageMetadataResponse)
            ? imageMetadataResponse.length
            : 0,
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
              galleries.find((g) => g.imageIds?.includes(img.imageId))?.name ||
              "",
          }));

          setGalleryImages(processedImages);

          // 🖼️ PROCESSED IMAGES DEBUGGING
          console.log("🖼️ UnifiedCopywriter: Processed gallery images:", {
            galleryImagesCount: processedImages.length,
            sampleProcessedImage: processedImages[0],
            metadataIntegrityCheck: {
              imagesWithAngle: processedImages.filter(
                (img) => img.metadata.angle
              ).length,
              imagesWithView: processedImages.filter((img) => img.metadata.view)
                .length,
              imagesWithMovement: processedImages.filter(
                (img) => img.metadata.movement
              ).length,
              imagesWithDescription: processedImages.filter(
                (img) => img.metadata.description
              ).length,
            },
            galleryNameMapping: processedImages.slice(0, 3).map((img) => ({
              imageId: img.id,
              galleryName: img.galleryName,
              hasGalleryName: !!img.galleryName,
            })),
          });
        }
      } catch (error) {
        console.warn(
          "🖼️ UnifiedCopywriter: Failed to fetch gallery images metadata:",
          error
        );
        setGalleryImages([]);
      }
    };

    processGalleryImages();
  }, [galleriesData, api]);

  // Enhanced debugging for loading states
  React.useEffect(() => {
    console.log("🐛 UnifiedCopywriter Debug Info:", {
      projectId,
      normalizedCarIds,
      carsEndpoint,
      captionsQuery,
      eventsEndpoint,
      galleriesEndpoint,
      initialCopywriterData: !!initialCopywriterData,
      isLoadingCars,
      isLoadingFullCars,
      isLoadingEvents,
      isLoadingCaptions,
      isLoadingGalleries,
      carsData: carsData?.length || 0,
      fullCarsData: fullCarsData?.length || 0,
      finalCarsData: finalCarsData?.length || 0,
      eventsData: eventsData?.length || 0,
      captionsData: captionsData?.length || 0,
      galleriesData: galleriesData?.galleries?.length || 0,
      errors: {
        carsError: !!carsError,
        fullCarsError: !!fullCarsError,
        eventsError: !!eventsError,
        captionsError: !!captionsError,
        galleriesError: !!galleriesError,
      },
    });
  }, [
    projectId,
    normalizedCarIds,
    carsEndpoint,
    captionsQuery,
    eventsEndpoint,
    galleriesEndpoint,
    initialCopywriterData,
    isLoadingCars,
    isLoadingFullCars,
    isLoadingEvents,
    isLoadingCaptions,
    isLoadingGalleries,
    carsData,
    fullCarsData,
    finalCarsData,
    eventsData,
    captionsData,
    galleriesData,
    carsError,
    fullCarsError,
    eventsError,
    captionsError,
    galleriesError,
  ]);

  // Loading and error states - don't show loading if we have initial data
  const isLoading =
    (!initialCopywriterData && isLoadingCars) ||
    (!initialCopywriterData && projectId && isLoadingFullCars) ||
    (!initialCopywriterData?.events && allowEventSelection && isLoadingEvents);
  const hasError = carsError || fullCarsError || eventsError || captionsError;

  // Non-blocking loading state with skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading {title || "copywriter"}...
            </p>
            <p className="text-xs text-muted-foreground text-center">
              You can switch tabs while this loads
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Non-blocking error state
  if (hasError && !finalCarsData) {
    return (
      <div className="py-8">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-4 max-w-md mx-auto">
          <p className="text-destructive text-sm text-center mb-3">
            Failed to load copywriter data. Tab switching is still available.
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

  if (!api) {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🚨 UnifiedCopywriter: No API available");
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing API...</p>
        </div>
      </div>
    );
  }

  // Allow copywriter to work with no cars (for project-only content)
  if ((!finalCarsData || finalCarsData.length === 0) && mode === "car") {
    console.log("🚨 UnifiedCopywriter: No car data available for car mode", {
      finalCarsDataLength: finalCarsData?.length || 0,
      finalCarsData: finalCarsData,
      projectId,
      normalizedCarIds,
      initialCopywriterData: !!initialCopywriterData,
    });

    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {!finalCarsData ? "Loading car data..." : "No cars found..."}
          </p>
        </div>
      </div>
    );
  }

  // Configuration for BaseCopywriter
  const config: CopywriterConfig = {
    mode,
    entityId,
    title:
      title || (mode === "project" ? "Project Copywriter" : "Car Copywriter"),
    apiEndpoints,
    features,
    loadingStates: {
      isLoadingModels,
      isLoadingGalleries,
      galleriesReady: !isLoadingGalleries && galleryImages.length > 0,
    },
  };

  // Callbacks for BaseCopywriter
  const callbacks: CopywriterCallbacks = {
    onDataFetch: async (): Promise<CopywriterData> => {
      try {
        // Convert cars to project car format
        const projectCars: ProjectCar[] = (finalCarsData || []).map(
          (car: any) => ({
            _id: car._id,
            year: car.year || 0,
            make: car.make || "",
            model: car.model || "",
            color: car.color,
            vin: car.vin,
            status: car.status || "available",
            primaryImageId: car.primaryImageId,
            createdAt: car.createdAt || new Date().toISOString(),
            // Include additional car details for rich copywriting
            engine: car.engine,
            transmission: car.transmission,
            dimensions: car.dimensions,
            manufacturing: car.manufacturing,
            performance: car.performance,
            interior_features: car.interior_features,
            interior_color: car.interior_color,
            condition: car.condition,
            location: car.location,
            doors: car.doors,
            safety: car.safety,
            description: car.description,
            mileage: car.mileage,
          })
        );

        // Convert events to project format - use initial data if available
        const events = initialCopywriterData?.events || eventsData || [];
        const projectEvents: ProjectEvent[] = events
          .filter((event: any) => {
            if (!event.id) {
              console.warn("🚨 Event without ID found:", event);
              return false;
            }
            return true;
          })
          .map((event: any) => ({
            id: event.id,
            [mode === "project" ? "project_id" : "car_id"]: entityId,
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
            // Include car information if available
            car: event.car
              ? {
                  _id: event.car._id,
                  make: event.car.make,
                  model: event.car.model,
                  year: event.car.year,
                  primaryImageId: event.car.primaryImageId,
                }
              : undefined,
          }));

        // Convert captions to unified format - prioritize fresh API data over initial data
        // Ensure we always have an array before mapping
        let rawCaptionsData: any =
          captionsData || initialCopywriterData?.captions || [];

        // Handle cases where API returns captions wrapped in an object (e.g., {captions: [...], total: 10})
        if (
          rawCaptionsData &&
          typeof rawCaptionsData === "object" &&
          !Array.isArray(rawCaptionsData)
        ) {
          if (
            (rawCaptionsData as any).captions &&
            Array.isArray((rawCaptionsData as any).captions)
          ) {
            rawCaptionsData = (rawCaptionsData as any).captions;
          } else if (
            (rawCaptionsData as any).data &&
            Array.isArray((rawCaptionsData as any).data)
          ) {
            rawCaptionsData = (rawCaptionsData as any).data;
          } else {
            console.warn(
              "🚨 UnifiedCopywriter: Caption data is not in expected format:",
              rawCaptionsData
            );
            rawCaptionsData = [];
          }
        }

        const captionsArray = Array.isArray(rawCaptionsData)
          ? rawCaptionsData
          : [];

        console.log(`🔍 UnifiedCopywriter: Processing captions data:`, {
          captionsDataType: typeof captionsData,
          captionsDataIsArray: Array.isArray(captionsData),
          initialCaptionsType: typeof initialCopywriterData?.captions,
          initialCaptionsIsArray: Array.isArray(
            initialCopywriterData?.captions
          ),
          finalArrayLength: captionsArray.length,
          rawCaptionsData: rawCaptionsData,
        });

        const savedCaptions = captionsArray.map((caption: any) => ({
          _id: caption._id,
          platform: caption.platform,
          context: caption.context,
          caption: caption.caption,
          projectId: projectId || entityId, // Use projectId if available, otherwise use entityId as fallback
          carIds: mode === "project" ? caption.carIds || [] : [entityId],
          eventIds: caption.eventIds || [],
          createdAt: caption.createdAt,
        }));

        // Convert models to project format - use initial data if available
        const models = initialCopywriterData?.models || modelsData || [];
        const projectModels = models.map((model: any) => ({
          ...model,
          _id: model._id,
        }));

        // Use galleries data from useAPIQuery and processed gallery images from state
        const galleries = galleriesData?.galleries || [];

        const result = {
          cars: projectCars,
          models: projectModels,
          events: projectEvents,
          galleries,
          galleryImages, // Use galleryImages from state
          systemPrompts: [], // Handled by shared cache in BaseCopywriter
          lengthSettings: [], // Handled by shared cache in BaseCopywriter
          savedCaptions,
          clientHandle:
            showClientHandle &&
            finalCarsData[0] &&
            "clientHandle" in finalCarsData[0]
              ? (finalCarsData[0] as any).clientHandle || null
              : null,

          hasMoreEvents: events.length > 5,
          hasMoreCaptions: captionsArray.length >= 4,
          hasMoreGalleries: false, // Gallery pagination not implemented yet
        };

        console.log("🖼️ UnifiedCopywriter: Final result:", {
          carsCount: result.cars.length,
          galleriesCount: result.galleries.length,
          galleryImagesCount: galleryImages.length,
          eventsCount: result.events.length,
          captionsCount: result.savedCaptions.length,
        });

        return result;
      } catch (error) {
        console.error("Error fetching copywriter data:", error);
        throw error;
      }
    },

    onSaveCaption: async (captionData: any): Promise<boolean> => {
      try {
        if (mode === "project") {
          await api.post(`projects/${projectId}/captions`, captionData);
        } else {
          await api.post("captions", {
            ...captionData,
            carId: entityId,
          });
        }

        toast({
          title: "Success",
          description: "Caption saved successfully",
        });

        // Note: onRefresh will handle the data refresh to avoid double-fetching

        // Trigger project update if provided
        if (onProjectUpdate) {
          onProjectUpdate();
        }

        return true;
      } catch (error: any) {
        console.error("Error saving caption:", error);

        // Handle specific error cases
        if (error?.status === 403) {
          toast({
            title: "Access Denied",
            description:
              "You don't have permission to save captions for this project",
            variant: "destructive",
          });
        } else if (error?.status === 404) {
          toast({
            title: "Project Not Found",
            description:
              "The project was not found or you don't have access to it",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to save caption",
            variant: "destructive",
          });
        }
        return false;
      }
    },

    onDeleteCaption: async (captionId: string): Promise<boolean> => {
      try {
        if (mode === "project") {
          await api.delete(`projects/${projectId}/captions/${captionId}`);
        } else {
          await api.delete(`captions/${captionId}?carId=${entityId}`);
        }

        toast({
          title: "Success",
          description: "Caption deleted successfully",
        });

        await refetchCaptions();
        return true;
      } catch (error) {
        console.error("Error deleting caption:", error);
        toast({
          title: "Error",
          description: "Failed to delete caption",
          variant: "destructive",
        });
        return false;
      }
    },

    onUpdateCaption: async (
      captionId: string,
      newText: string
    ): Promise<boolean> => {
      try {
        if (mode === "project") {
          await api.patch(`projects/${projectId}/captions/${captionId}`, {
            caption: newText,
          });
        } else {
          await api.patch(`captions/${captionId}`, {
            caption: newText,
          });
        }

        toast({
          title: "Success",
          description: "Caption updated successfully",
        });

        await refetchCaptions();
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
      try {
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔄 UnifiedCopywriter: Refreshing caption data...");
        await refetchCaptions();
        console.log(
          "✅ UnifiedCopywriter: Caption data refreshed successfully"
        );
      } catch (error) {
        console.error(
          "❌ UnifiedCopywriter: Error refreshing caption data:",
          error
        );
        // Don't throw to prevent breaking the UI
      }
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
