"use client";

import React from "react";
import { toast } from "@/components/ui/use-toast";
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
import { useAPI } from "@/hooks/useAPI";

interface CarCopywriterProps {
  carId: string;
}

export function CarCopywriter({ carId }: CarCopywriterProps) {
  const api = useAPI();

  if (!api) return <div>Loading...</div>;

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
        // Fetch car details
        const carData = (await api.get(`cars/${carId}`)) as any;

        // Convert to project car format
        const projectCar: ProjectCar = {
          _id: carData._id,
          year: carData.year || 0,
          make: carData.make || "",
          model: carData.model || "",
          color: carData.color,
          vin: carData.vin,
          status: carData.status || "available",
          createdAt: new Date().toISOString(),
        };

        // Fetch car events
        let carEvents: ProjectEvent[] = [];
        try {
          const events = (await api.get(`cars/${carId}/events`)) as any[];
          carEvents = events.map((event: any) => ({
            id: event._id,
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
        } catch (error) {
          console.error("Error fetching car events:", error);
        }

        // Fetch system prompts
        const systemPrompts = (await api.get(`system-prompts/active`)) as any;

        // Fetch length settings
        let lengthSettings = [];
        try {
          lengthSettings = (await api.get(`admin/length-settings`)) as any[];
        } catch (error) {
          console.error("Error fetching length settings:", error);
        }

        // Fetch saved captions
        let savedCaptionsData = [];
        try {
          savedCaptionsData = (await api.get(
            `captions?carId=${carId}`
          )) as any[];
        } catch (error) {
          console.error("Error fetching saved captions:", error);
        }

        // Convert car captions to project caption format
        const savedCaptions = savedCaptionsData.map((caption: any) => ({
          _id: caption._id,
          platform: caption.platform,
          context: caption.context,
          caption: caption.caption,
          projectId: "",
          carIds: [caption.carId],
          eventIds: [],
          createdAt: caption.createdAt,
        }));

        // Get client handle
        let clientHandle: string | null = null;
        try {
          const clientId =
            carData.client || carData.clientId || carData.clientInfo?._id;
          if (clientId) {
            const client = (await api.get(`clients/${clientId}`)) as any;
            if (client.socialMedia?.instagram) {
              clientHandle = `@${client.socialMedia.instagram.replace(/^@/, "")}`;
            }
          }
        } catch (error) {
          console.error("Error fetching client data:", error);
        }

        return {
          cars: [projectCar],
          events: carEvents,
          systemPrompts,
          lengthSettings,
          savedCaptions,
          clientHandle,
        };
      } catch (error) {
        console.error("Error fetching car copywriter data:", error);
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
      // This will be handled by the BaseCopywriter component
      // by re-calling onDataFetch when needed
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
