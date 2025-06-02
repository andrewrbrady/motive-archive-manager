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

  // Use optimized query hook for car data - non-blocking, cached
  const {
    data: carData,
    isLoading: isLoadingCar,
    error: carError,
  } = useAPIQuery<any>(`cars/${carId}`, {
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

  // Use optimized query hook for system prompts - non-blocking, cached
  const {
    data: systemPromptsData,
    isLoading: isLoadingSystemPrompts,
    error: systemPromptsError,
  } = useAPIQuery<any[]>(`system-prompts/list`, {
    staleTime: 5 * 60 * 1000, // 5 minutes cache for static data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Use optimized query hook for length settings - non-blocking, cached
  const {
    data: lengthSettingsData,
    isLoading: isLoadingLengthSettings,
    error: lengthSettingsError,
  } = useAPIQuery<any[]>(`length-settings`, {
    staleTime: 5 * 60 * 1000, // 5 minutes cache for static data
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

  // Determine overall loading state
  const isLoading =
    isLoadingCar ||
    isLoadingEvents ||
    isLoadingSystemPrompts ||
    isLoadingLengthSettings;
  const hasError =
    carError ||
    eventsError ||
    systemPromptsError ||
    lengthSettingsError ||
    captionsError;

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
    },
    features: {
      allowMultipleCars: false,
      allowEventSelection: true,
      allowMinimalCarData: false,
      showClientHandle: true,
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

        return {
          cars: [projectCar],
          events: projectEvents,
          systemPrompts: systemPromptsData || [],
          lengthSettings: lengthSettingsData || [],
          savedCaptions: savedCaptions,
          clientHandle: null, // TODO: Implement client handle fetching if needed
          hasMoreEvents: hasMoreEventsAvailable,
          hasMoreCaptions: hasMoreCaptionsAvailable,
        };
      } catch (error) {
        console.error("Error processing car copywriter data:", error);
        throw error;
      }
    },

    onSaveCaption: async (captionData: any): Promise<boolean> => {
      try {
        await api.post("captions", {
          platform: captionData.platform,
          carId: carId,
          context: captionData.context,
          caption: captionData.caption,
        });

        toast({
          title: "Success",
          description: "Caption saved successfully",
        });

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
        await api.delete(`captions?id=${captionId}&carId=${carId}`);

        toast({
          title: "Success",
          description: "Caption deleted successfully",
        });

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
        await api.patch(`captions?id=${captionId}`, {
          caption: newText,
        });

        toast({
          title: "Success",
          description: "Caption updated successfully",
        });

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
      // Refresh captions data
      await refetchCaptions();
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
