"use client";

import React from "react";
import { toast } from "@/components/ui/use-toast";
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
        // Fetch project cars
        const carsResponse = await fetch(`/api/projects/${project._id}/cars`);
        if (!carsResponse.ok) throw new Error("Failed to fetch project cars");
        const carsData = await carsResponse.json();

        // Convert to project car format
        const projectCars: ProjectCar[] = carsData.map((car: any) => ({
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

        // Fetch project events
        const eventsResponse = await fetch(
          `/api/projects/${project._id}/events`
        );
        let projectEvents: ProjectEvent[] = [];
        if (eventsResponse.ok) {
          const events = await eventsResponse.json();
          projectEvents = events.map((event: any) => ({
            id: event._id,
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
          }));
        }

        // Fetch system prompts
        const systemPromptsResponse = await fetch(`/api/system-prompts/active`);
        if (!systemPromptsResponse.ok)
          throw new Error("Failed to fetch system prompts");
        const systemPrompts = await systemPromptsResponse.json();

        // Fetch length settings
        const lengthResponse = await fetch(`/api/admin/length-settings`);
        const lengthSettings = lengthResponse.ok
          ? await lengthResponse.json()
          : [];

        // Fetch saved captions
        const captionsResponse = await fetch(
          `/api/projects/${project._id}/captions`
        );
        const savedCaptionsData = captionsResponse.ok
          ? await captionsResponse.json()
          : [];

        // Convert to project caption format (already in correct format for projects)
        const savedCaptions = savedCaptionsData.map((caption: any) => ({
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
          events: projectEvents,
          systemPrompts,
          lengthSettings,
          savedCaptions,
          clientHandle: null, // Projects don't typically have client handles
        };
      } catch (error) {
        console.error("Error fetching project copywriter data:", error);
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
      // Refresh project data
      onProjectUpdate();
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
