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
  };

  // Smart endpoint configuration
  const apiEndpoints = React.useMemo(() => {
    if (projectId) {
      return {
        captions: `/api/projects/${projectId}/captions`,
        systemPrompts: `system-prompts/active`,
        events: `/api/projects/${projectId}/events`,
      };
    } else {
      const primaryCarId = normalizedCarIds[0];
      return {
        captions: `captions`,
        systemPrompts: `system-prompts/active`,
        events: primaryCarId ? `cars/${primaryCarId}/events` : undefined,
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
    enabled: !!carsEndpoint,
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
        console.log(`🚗 UnifiedCopywriter: Project cars parsed:`, result);
        return result;
      } else if (normalizedCarIds.length === 1) {
        // Single car response
        const result = [data];
        console.log(`🚗 UnifiedCopywriter: Single car parsed:`, result);
        return result;
      } else {
        // Batch cars response
        const result = Array.isArray(data) ? data : data?.cars || [];
        console.log(`🚗 UnifiedCopywriter: Batch cars parsed:`, result);
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
    enabled: Boolean(projectId && projectCarIds.length > 0 && fullCarsEndpoint),
    staleTime: 3 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    select: (data: any) => {
      console.log(`🔧 UnifiedCopywriter: Full car details response:`, data);
      if (projectCarIds.length === 1) {
        return [data];
      } else {
        return Array.isArray(data) ? data : data?.cars || [];
      }
    },
  });

  // Use full car data if available (project mode), otherwise use basic car data
  const finalCarsData = React.useMemo(() => {
    if (projectId && fullCarsData && fullCarsData.length > 0) {
      console.log(
        `🚗 UnifiedCopywriter: Using full car data for project mode:`,
        fullCarsData
      );
      return fullCarsData;
    }
    console.log(`🚗 UnifiedCopywriter: Using basic car data:`, carsData || []);
    return carsData || [];
  }, [projectId, fullCarsData, carsData]);

  // Events data fetching
  const eventsEndpoint = apiEndpoints.events;
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useAPIQuery<any[]>(eventsEndpoint!, {
    enabled: !!eventsEndpoint && allowEventSelection,
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
    enabled: !!carsEndpoint, // Enable if we have a cars endpoint (either project or car mode)
    staleTime: 1 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Loading and error states
  const isLoading =
    isLoadingCars ||
    (projectId && isLoadingFullCars) ||
    (allowEventSelection && isLoadingEvents);
  const hasError = carsError || fullCarsError || eventsError || captionsError;

  // Non-blocking loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading {title || "copywriter"}...
          </p>
          <p className="text-xs text-muted-foreground text-center">
            You can switch tabs while this loads
          </p>
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

  if (!api || !finalCarsData || finalCarsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
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

        // Convert events to project format
        const events = eventsData || [];
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
          }));

        // Convert captions to unified format
        const savedCaptions = (captionsData || []).map((caption: any) => ({
          _id: caption._id,
          platform: caption.platform,
          context: caption.context,
          caption: caption.caption,
          projectId: projectId || entityId, // Use projectId if available, otherwise use entityId as fallback
          carIds: mode === "project" ? caption.carIds || [] : [entityId],
          eventIds: caption.eventIds || [],
          createdAt: caption.createdAt,
        }));

        return {
          cars: projectCars,
          events: projectEvents,
          systemPrompts: [], // Handled by shared cache in BaseCopywriter
          lengthSettings: [], // Handled by shared cache in BaseCopywriter
          savedCaptions,
          clientHandle:
            showClientHandle &&
            finalCarsData[0] &&
            "clientHandle" in finalCarsData[0]
              ? (finalCarsData[0] as any).clientHandle || null
              : null,
          // Enhanced data integration - empty arrays for lazy loading
          deliverables: [],
          galleries: [],
          inspections: [],
          hasMoreEvents: events.length > 5,
          hasMoreCaptions: captionsData ? captionsData.length >= 4 : false,
        };
      } catch (error) {
        console.error("Error fetching copywriter data:", error);
        throw error;
      }
    },

    onConditionalDataFetch: async (
      sections
    ): Promise<Partial<CopywriterData>> => {
      const result: Partial<CopywriterData> = {};

      try {
        // Fetch deliverables if requested
        if (sections.deliverables) {
          try {
            const deliverablesEndpoint =
              mode === "project"
                ? `projects/${projectId}/deliverables`
                : `cars/${entityId}/deliverables`;

            const deliverablesResponse = await api.get(deliverablesEndpoint);
            result.deliverables = Array.isArray(deliverablesResponse)
              ? deliverablesResponse
              : [];

            console.log(
              `📦 UnifiedCopywriter: Conditionally fetched ${result.deliverables.length} deliverables for ${mode} ${entityId}`
            );
          } catch (deliverablesError) {
            console.warn(
              `⚠️ UnifiedCopywriter: Failed to conditionally fetch deliverables for ${mode} ${entityId}:`,
              deliverablesError
            );
            result.deliverables = [];
          }
        }

        // Fetch galleries if requested
        if (sections.galleries) {
          try {
            const galleriesEndpoint =
              mode === "project"
                ? `projects/${projectId}/galleries`
                : `cars/${entityId}/galleries`;

            const galleriesResponse = await api.get(galleriesEndpoint);
            result.galleries = Array.isArray(galleriesResponse)
              ? galleriesResponse
              : [];

            console.log(
              `🖼️ UnifiedCopywriter: Conditionally fetched ${result.galleries.length} galleries for ${mode} ${entityId}`
            );
          } catch (galleriesError) {
            console.warn(
              `⚠️ UnifiedCopywriter: Failed to conditionally fetch galleries for ${mode} ${entityId}:`,
              galleriesError
            );
            result.galleries = [];
          }
        }

        // Fetch inspections if requested
        if (sections.inspections) {
          try {
            const inspectionsEndpoint =
              mode === "project"
                ? `projects/${projectId}/inspections`
                : `cars/${entityId}/inspections`;

            const inspectionsResponse = await api.get(inspectionsEndpoint);
            result.inspections = Array.isArray(inspectionsResponse)
              ? inspectionsResponse
              : [];

            console.log(
              `🔍 UnifiedCopywriter: Conditionally fetched ${result.inspections.length} inspections for ${mode} ${entityId}`
            );
          } catch (inspectionsError) {
            console.warn(
              `⚠️ UnifiedCopywriter: Failed to conditionally fetch inspections for ${mode} ${entityId}:`,
              inspectionsError
            );
            result.inspections = [];
          }
        }

        return result;
      } catch (error) {
        console.error("Error in conditional data fetch:", error);
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

        // Refresh captions
        await refetchCaptions();

        // Trigger project update if provided
        if (onProjectUpdate) {
          onProjectUpdate();
        }

        return true;
      } catch (error) {
        console.error("Error saving caption:", error);
        toast({
          title: "Error",
          description: "Failed to save caption",
          variant: "destructive",
        });
        return false;
      }
    },

    onDeleteCaption: async (captionId: string): Promise<boolean> => {
      try {
        if (mode === "project") {
          await api.delete(`projects/${projectId}/captions/${captionId}`);
        } else {
          await api.delete(`captions?id=${captionId}&carId=${entityId}`);
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
      await Promise.all([
        refetchCaptions(),
        // Could add more refresh operations here
      ]);
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
