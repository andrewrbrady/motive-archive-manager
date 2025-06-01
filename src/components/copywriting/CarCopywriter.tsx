"use client";

import React, { useState, useEffect } from "react";
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

// Simple in-memory cache for static data that rarely changes
const staticDataCache = {
  systemPrompts: null as any,
  lengthSettings: null as any,
  timestamp: 0,
  isValid: () => Date.now() - staticDataCache.timestamp < 300000, // 5 minutes
};

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
        // CRITICAL PATH: Fetch essentials + cached static data
        const [carData, carEvents, systemPrompts, lengthSettings] =
          await Promise.all([
            // Car details - CRITICAL
            api.get(`cars/${carId}`) as Promise<any>,

            // Events with aggressive limit (only 5 events initially) - CRITICAL
            api.get(`cars/${carId}/events?limit=6`) as Promise<any[]>, // Fetch 6 to check if there are more

            // System prompts - ESSENTIAL for UI dropdowns (use cache if available)
            (async () => {
              if (staticDataCache.isValid() && staticDataCache.systemPrompts) {
                console.log("Using cached system prompts");
                return staticDataCache.systemPrompts;
              }
              try {
                const data = (await api.get(`system-prompts/list`)) as any;
                console.log("Successfully fetched system prompts:", data);
                staticDataCache.systemPrompts = data;
                staticDataCache.timestamp = Date.now();
                return data;
              } catch (error) {
                console.error("Error fetching system prompts:", error);
                return [];
              }
            })(),

            // Length settings - ESSENTIAL for UI dropdowns (use cache if available)
            (async () => {
              if (staticDataCache.isValid() && staticDataCache.lengthSettings) {
                console.log("Using cached length settings");
                return staticDataCache.lengthSettings;
              }
              try {
                const data = (await api.get(`length-settings`)) as any[];
                console.log("Successfully fetched length settings:", data);
                staticDataCache.lengthSettings = data;
                staticDataCache.timestamp = Date.now();
                return data;
              } catch (error) {
                console.error("Error fetching length settings:", error);
                return [];
              }
            })(),
          ]);

        // Convert to project car format immediately
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

        // Convert events to project format immediately
        const hasMoreEventsAvailable = carEvents.length > 5;
        const eventsToDisplay = carEvents.slice(0, 5); // Only show first 5

        const projectEvents: ProjectEvent[] = eventsToDisplay
          .filter((event: any) => {
            if (!event._id) {
              console.warn("🚨 Event without ID found:", event);
              return false;
            }
            return true;
          })
          .map((event: any) => ({
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

        // FETCH NON-CRITICAL DATA ASYNCHRONOUSLY (captions and client handle)
        const fetchNonCriticalData = async () => {
          try {
            // Always fetch captions fresh (user-specific data)
            let savedCaptionsData = [];
            let hasMoreCaptionsAvailable = false;
            try {
              savedCaptionsData = (await api.get(
                `captions?carId=${carId}&limit=4&sort=-createdAt` // Fetch 4 to check if there are more
              )) as any[];
              hasMoreCaptionsAvailable = savedCaptionsData.length > 3;
              savedCaptionsData = savedCaptionsData.slice(0, 3); // Only show first 3
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

            return { savedCaptions, hasMoreCaptionsAvailable };
          } catch (error) {
            console.error("Error in background fetch:", error);
            return { savedCaptions: [], hasMoreCaptionsAvailable: false };
          }
        };

        // Start background fetch for captions
        let savedCaptions: any[] = [];
        let hasMoreCaptionsAvailable = false;

        try {
          const captionData = await fetchNonCriticalData();
          savedCaptions = captionData.savedCaptions;
          hasMoreCaptionsAvailable = captionData.hasMoreCaptionsAvailable;
        } catch (error) {
          console.error("Background caption fetch failed:", error);
        }

        // FETCH CLIENT HANDLE ASYNCHRONOUSLY (lowest priority)
        const clientId =
          carData.client || carData.clientId || carData.clientInfo?._id;
        if (clientId) {
          const fetchClientHandle = async () => {
            try {
              const client = (await api.get(`clients/${clientId}`)) as any;

              if (client.socialMedia?.instagram) {
                // Client handle is ready but we don't try to update UI directly
                // The data will be available when the component refreshes or re-fetches
              }
            } catch (error) {
              console.error("Error fetching client handle:", error);
            }
          };

          // Fire and forget - lowest priority
          fetchClientHandle().catch((error) => {
            console.error("Client handle fetch error (non-critical):", error);
            // Don't throw - this is non-critical data
          });
        }

        // RETURN COMPLETE DATA with all essential fields populated
        const result = {
          cars: [projectCar],
          events: projectEvents,
          systemPrompts: systemPrompts || [],
          lengthSettings: lengthSettings || [],
          savedCaptions: savedCaptions,
          clientHandle: null, // Will be populated asynchronously
          hasMoreEvents: hasMoreEventsAvailable,
          hasMoreCaptions: hasMoreCaptionsAvailable,
        };

        console.log("CarCopywriter: Returning data:", {
          carsCount: result.cars.length,
          eventsCount: result.events.length,
          systemPromptsCount: result.systemPrompts.length,
          lengthSettingsCount: result.lengthSettings.length,
          savedCaptionsCount: result.savedCaptions.length,
          systemPromptsFirst: result.systemPrompts[0],
          lengthSettingsFirst: result.lengthSettings[0],
        });

        return result;
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
