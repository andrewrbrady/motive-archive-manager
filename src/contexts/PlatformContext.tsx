/**
 * Platform Context - Global platform data management
 *
 * This context solves the N+1 API call problem where every PlatformBadges component
 * was making its own API call to fetch platform data. Now platforms are fetched
 * once and cached globally.
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { APIClient } from "@/lib/api-client";
import { DeliverablePlatform } from "@/types/deliverable";

interface PlatformContextType {
  platforms: DeliverablePlatform[];
  isLoading: boolean;
  error: string | null;
  getPlatformById: (id: string) => DeliverablePlatform | undefined;
  getPlatformByName: (name: string) => DeliverablePlatform | undefined;
  getPlatformsByIds: (ids: string[]) => DeliverablePlatform[];
}

const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined
);

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  const [platforms, setPlatforms] = useState<DeliverablePlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions for easy platform lookup
  const getPlatformById = (id: string): DeliverablePlatform | undefined => {
    return platforms.find((platform) => platform._id === id);
  };

  const getPlatformByName = (name: string): DeliverablePlatform | undefined => {
    return platforms.find((platform) => platform.name === name);
  };

  const getPlatformsByIds = (ids: string[]): DeliverablePlatform[] => {
    return platforms.filter((platform) => ids.includes(platform._id));
  };

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use public API since platforms are static reference data
        const apiClient = APIClient.getInstance();
        const response = await apiClient.getPublic("/api/platforms");

        const platformData: DeliverablePlatform[] = Array.isArray(response)
          ? response
          : (response as any)?.platforms || [];

        setPlatforms(platformData);

        if (process.env.NODE_ENV === "development") {
          console.log(
            `✅ PlatformContext: Loaded ${platformData.length} platforms globally`
          );
        }
      } catch (error) {
        console.error("❌ PlatformContext: Failed to fetch platforms:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load platforms"
        );
        setPlatforms([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  const contextValue: PlatformContextType = {
    platforms,
    isLoading,
    error,
    getPlatformById,
    getPlatformByName,
    getPlatformsByIds,
  };

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatforms(): PlatformContextType {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error("usePlatforms must be used within a PlatformProvider");
  }
  return context;
}
