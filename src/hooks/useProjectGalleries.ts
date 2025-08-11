"use client";

import { useState, useEffect, useCallback } from "react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/use-toast";

interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  imageCount: number;
  thumbnailImage?: {
    _id: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface UseProjectGalleriesResult {
  galleries: Gallery[];
  availableGalleries: Gallery[];
  isLoading: boolean;
  error: string | null;
  createGallery: (data: {
    name: string;
    description: string;
  }) => Promise<Gallery | null>;
  linkGallery: (galleryId: string) => Promise<boolean>;
  unlinkGallery: (galleryId: string) => Promise<boolean>;
  refetchGalleries: () => Promise<void>;
  refetchAvailableGalleries: () => Promise<void>;
}

export function useProjectGalleries(
  projectId?: string
): UseProjectGalleriesResult {
  const api = useAPI();
  const { toast } = useToast();

  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [availableGalleries, setAvailableGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch galleries linked to the project
  const fetchProjectGalleries = useCallback(async () => {
    if (!api || !projectId) {
      setGalleries([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = (await api.get(
        `/api/projects/${projectId}/galleries`
      )) as {
        galleries: Gallery[];
      };

      setGalleries(response.galleries || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch project galleries";
      setError(errorMessage);
      console.error("Error fetching project galleries:", err);

      if (errorMessage.includes("Not authenticated")) {
        toast({
          title: "Authentication Error",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, projectId, toast]);

  // Fetch all available galleries (not linked to project)
  const fetchAvailableGalleries = useCallback(async () => {
    if (!api) {
      setAvailableGalleries([]);
      return;
    }

    try {
      const response = (await api.get("/api/galleries")) as
        | { galleries: Gallery[]; pagination?: any }
        | Gallery[];

      // Handle both response formats
      const allGalleries = Array.isArray(response)
        ? response
        : response.galleries || [];

      // Filter out galleries already linked to this project
      const unlinkedGalleries = allGalleries.filter(
        (gallery) => !galleries.some((linked) => linked._id === gallery._id)
      );

      setAvailableGalleries(unlinkedGalleries);
    } catch (err) {
      console.error("Error fetching available galleries:", err);
    }
  }, [api, galleries]);

  // Create a new gallery
  const createGallery = useCallback(
    async (data: {
      name: string;
      description: string;
    }): Promise<Gallery | null> => {
      if (!api) return null;

      try {
        const newGallery = (await api.post("/api/galleries", data)) as Gallery;

        // If we have a project, automatically link the new gallery
        if (projectId) {
          await linkGallery(newGallery._id);
        }

        return newGallery;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create gallery";
        setError(errorMessage);
        console.error("Error creating gallery:", err);
        return null;
      }
    },
    [api, projectId]
  );

  // Link an existing gallery to the project
  const linkGallery = useCallback(
    async (galleryId: string): Promise<boolean> => {
      if (!api || !projectId) return false;

      try {
        await api.post(`/api/projects/${projectId}/galleries`, {
          galleryId,
        });

        // Refresh both gallery lists
        await Promise.all([fetchProjectGalleries(), fetchAvailableGalleries()]);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to link gallery";
        setError(errorMessage);
        console.error("Error linking gallery:", err);
        return false;
      }
    },
    [api, projectId, fetchProjectGalleries, fetchAvailableGalleries]
  );

  // Unlink a gallery from the project
  const unlinkGallery = useCallback(
    async (galleryId: string): Promise<boolean> => {
      if (!api || !projectId) return false;

      try {
        await api.delete(`/api/projects/${projectId}/galleries/${galleryId}`);

        // Refresh both gallery lists
        await Promise.all([fetchProjectGalleries(), fetchAvailableGalleries()]);

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to unlink gallery";
        setError(errorMessage);
        console.error("Error unlinking gallery:", err);
        return false;
      }
    },
    [api, projectId, fetchProjectGalleries, fetchAvailableGalleries]
  );

  // Refetch functions for external use
  const refetchGalleries = useCallback(async () => {
    await fetchProjectGalleries();
  }, [fetchProjectGalleries]);

  const refetchAvailableGalleries = useCallback(async () => {
    await fetchAvailableGalleries();
  }, [fetchAvailableGalleries]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProjectGalleries();
  }, [fetchProjectGalleries]);

  return {
    galleries,
    availableGalleries,
    isLoading,
    error,
    createGallery,
    linkGallery,
    unlinkGallery,
    refetchGalleries,
    refetchAvailableGalleries,
  };
}
