"use client";

import React from "react";
import { toast } from "@/components/ui/use-toast";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BaseCopywriter,
  CopywriterConfig,
  CopywriterCallbacks,
  CopywriterData,
} from "./BaseCopywriter";
import { useProjectData } from "../projects/caption-generator/useProjectData";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import type { Project } from "@/types/project";
import type {
  ProjectCar,
  ProjectEvent,
} from "../projects/caption-generator/types";

interface ProjectCopywriterProps {
  project: Project;
  onProjectUpdate: () => void;
}

/**
 * ProjectCopywriter - Non-blocking copywriter for projects
 * Part of Phase 1 optimization - uses useAPIQuery for all data fetching
 * Users can switch tabs while data loads in background
 */
export function ProjectCopywriter({
  project,
  onProjectUpdate,
}: ProjectCopywriterProps) {
  const { user } = useFirebaseAuth();

  if (!project._id) {
    return (
      <div className="text-center py-8 text-[hsl(var(--foreground-muted))]">
        <p>Project ID is required to generate content.</p>
      </div>
    );
  }

  // Use optimized query hooks for project data - non-blocking, cached
  const {
    data: carsData,
    isLoading: isLoadingCars,
    error: carsError,
  } = useAPIQuery<any[]>(`projects/${project._id}/cars`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache for project data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    error: eventsError,
  } = useAPIQuery<any[]>(`projects/${project._id}/events?includeCars=true`, {
    staleTime: 3 * 60 * 1000, // 3 minutes cache for project data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: captionsData,
    isLoading: isLoadingCaptions,
    error: captionsError,
    refetch: refetchCaptions,
  } = useAPIQuery<any[]>(`projects/${project._id}/captions`, {
    staleTime: 1 * 60 * 1000, // 1 minute cache for user data
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Determine overall loading state - only entity-specific data
  const isLoading = isLoadingCars || isLoadingEvents;

  const hasError = carsError || eventsError || captionsError;

  // Show non-blocking loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading project copywriter...
          </p>
          <p className="text-xs text-muted-foreground text-center">
            You can switch tabs while this loads
          </p>
        </div>
      </div>
    );
  }

  // Show non-blocking error state
  if (hasError && !carsData) {
    return (
      <div className="py-8">
        <div className="bg-destructive/15 border border-destructive/20 rounded-md p-4 max-w-md mx-auto">
          <p className="text-destructive text-sm text-center mb-3">
            Failed to load project copywriter data. Tab switching is still
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

  const config: CopywriterConfig = {
    mode: "project",
    entityId: project._id,
    title: "Project Copywriter",
    apiEndpoints: {
      captions: `/api/projects/${project._id}/captions`,
      systemPrompts: `/api/system-prompts/active`,
      events: `/api/projects/${project._id}/events`,
    },
    features: {
      allowMultipleCars: true,
      allowEventSelection: true,
      allowMinimalCarData: true,
      showClientHandle: false,
    },
  };

  const callbacks: CopywriterCallbacks = {
    onDataFetch: async (): Promise<CopywriterData> => {
      try {
        // Convert to project car format
        const projectCars: ProjectCar[] = (carsData || []).map((car: any) => ({
          _id: car._id,
          year: car.year || 0,
          make: car.make || "",
          model: car.model || "",
          color: car.color,
          vin: car.vin,
          status: car.status || "available",
          primaryImageId: car.primaryImageId,
          imageIds: car.imageIds || [],
          createdAt: car.createdAt || new Date().toISOString(),
        }));

        // Convert events to project format
        const projectEvents: ProjectEvent[] = (eventsData || []).map(
          (event: any) => ({
            id: event._id || event.id,
            project_id: project._id,
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
          })
        );

        // Convert captions to project caption format
        const savedCaptions = (captionsData || []).map((caption: any) => ({
          _id: caption._id,
          platform: caption.platform,
          context: caption.context,
          caption: caption.caption,
          projectId: caption.projectId,
          carIds: caption.carIds || [],
          eventIds: caption.eventIds || [],
          createdAt: caption.createdAt,
        }));

        return {
          cars: projectCars,
          models: [], // Empty array for models - not handled by legacy ProjectCopywriter
          events: projectEvents,
          systemPrompts: [], // Now handled by shared cache in BaseCopywriter
          lengthSettings: [], // Now handled by shared cache in BaseCopywriter
          savedCaptions,
          clientHandle: null, // Projects don't typically have client handles
        };
      } catch (error) {
        console.error("Error processing project copywriter data:", error);
        throw error;
      }
    },

    onSaveCaption: async (captionData: any): Promise<boolean> => {
      try {
        if (!user) {
          throw new Error("No authenticated user found");
        }

        const token = await user.getIdToken();

        const response = await fetch(`/api/projects/${project._id}/captions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            platform: captionData.platform,
            context: captionData.context,
            caption: captionData.caption,
            carIds: captionData.carIds || [],
            eventIds: captionData.eventIds || [],
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save caption");
        }

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
        if (!user) {
          throw new Error("No authenticated user found");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `/api/projects/${project._id}/captions/${captionId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete caption");
        }

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
        if (!user) {
          throw new Error("No authenticated user found");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `/api/projects/${project._id}/captions/${captionId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              caption: newText,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update caption");
        }

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
      // Refresh captions data with optimized cache invalidation
      await refetchCaptions();
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
