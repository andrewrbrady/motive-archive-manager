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

interface CarCopywriterProps {
  carId: string;
}

export function CarCopywriter({ carId }: CarCopywriterProps) {
  const config: CopywriterConfig = {
    mode: "car",
    entityId: carId,
    title: "Car Copywriter",
    apiEndpoints: {
      captions: `/api/captions`,
      systemPrompts: `/api/system-prompts/active`,
      events: `/api/cars/${carId}/events`,
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
        const carResponse = await fetch(`/api/cars/${carId}`);
        if (!carResponse.ok) throw new Error("Failed to fetch car details");
        const carData = await carResponse.json();

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
          const eventsResponse = await fetch(`/api/cars/${carId}/events`);
          if (eventsResponse.ok) {
            const events = await eventsResponse.json();
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
          }
        } catch (error) {
          console.error("Error fetching car events:", error);
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
        const captionsResponse = await fetch(`/api/captions?carId=${carId}`);
        const savedCaptionsData = captionsResponse.ok
          ? await captionsResponse.json()
          : [];

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
            const clientRes = await fetch(`/api/clients/${clientId}`);
            if (clientRes.ok) {
              const client = await clientRes.json();
              if (client.socialMedia?.instagram) {
                clientHandle = `@${client.socialMedia.instagram.replace(/^@/, "")}`;
              }
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
        const response = await fetch("/api/captions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            platform: captionData.platform,
            carId: carId,
            context: captionData.context,
            caption: captionData.caption,
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
        const response = await fetch(
          `/api/captions?id=${captionId}&carId=${carId}`,
          {
            method: "DELETE",
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
        const response = await fetch(`/api/captions?id=${captionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            caption: newText,
          }),
        });

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
      // This will be handled by the BaseCopywriter component
      // by re-calling onDataFetch when needed
    },
  };

  return <BaseCopywriter config={config} callbacks={callbacks} />;
}
