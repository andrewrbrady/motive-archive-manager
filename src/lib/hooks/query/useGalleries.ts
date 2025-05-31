import { useState, useCallback, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api-client";

export interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  orderedImages?: {
    id: string;
    order: number;
  }[];
  images?: any[];
  thumbnailImage?: {
    _id: string;
    url: string;
    filename?: string;
    metadata?: {
      description?: string;
      [key: string]: any;
    };
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface UseGalleriesResponse {
  data: {
    galleries: Gallery[];
    pagination: PaginationData;
  } | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

interface UseGalleriesOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export function useGalleries(
  options: UseGalleriesOptions = {}
): UseGalleriesResponse {
  const [data, setData] = useState<UseGalleriesResponse["data"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: session, status } = useSession();

  const fetchGalleries = useCallback(async () => {
    // Only fetch when authenticated
    if (status !== "authenticated" || !session?.user) {
      console.log("🐛 useGalleries: Waiting for authentication...", {
        status,
        hasUser: !!session?.user,
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      const searchParams = new URLSearchParams();
      if (options.search) searchParams.set("search", options.search);
      if (options.page) searchParams.set("page", options.page.toString());
      if (options.limit) searchParams.set("limit", options.limit.toString());

      console.log(
        "🐛 useGalleries: Fetching data from:",
        `/galleries?${searchParams.toString()}`
      );

      const result = await api.get<{
        galleries: Gallery[];
        pagination: PaginationData;
      }>(`/galleries?${searchParams.toString()}`);

      console.log("🐛 useGalleries: Raw API result:", result);
      console.log("🐛 useGalleries: Result type:", typeof result);
      console.log(
        "🐛 useGalleries: Result keys:",
        result ? Object.keys(result) : null
      );
      console.log("🐛 useGalleries: Galleries array:", result?.galleries);
      console.log(
        "🐛 useGalleries: Galleries length:",
        result?.galleries?.length
      );

      setData(result);
      console.log("🐛 useGalleries: Data set successfully");
    } catch (err) {
      console.error("🐛 useGalleries: Error:", err);
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to fetch galleries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [options.search, options.page, options.limit, status, session]);

  const mutate = useCallback(async () => {
    await fetchGalleries();
  }, [fetchGalleries]);

  // Initial fetch - only when authentication is ready
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchGalleries();
    } else if (status === "unauthenticated") {
      // If not authenticated, set appropriate state
      setIsLoading(false);
      setError(new Error("Not authenticated"));
    }
  }, [fetchGalleries, status, session]);

  return { data, isLoading, error, mutate };
}

export function useGallery(id: string) {
  const [data, setData] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: session, status } = useSession();

  const fetchGallery = useCallback(async () => {
    // Only fetch when authenticated
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await api.get<Gallery>(`/galleries/${id}`);

      // Log debug information if available to help troubleshoot image count mismatches
      if ((result as any)._debug) {
        const debugInfo = (result as any)._debug;
        console.log(`🔍 Gallery ${id} Debug Info:`, debugInfo);
        if (debugInfo.cleanupPerformed) {
          console.log(
            `🧹 Cleanup performed! Removed ${debugInfo.orphanedImageCount} orphaned image references`
          );
        }

        if (debugInfo.orderedImagesRebuilt) {
          console.log(
            `🔧 orderedImages rebuilt! Added ${debugInfo.orderedImagesMissing} missing images to orderedImages array`
          );
        }

        // Additional debugging for image count mismatches
        console.log(`📊 Image Count Analysis:`, {
          "Original imageIds in gallery": debugInfo.originalImageCount,
          "Actual images found in DB": debugInfo.foundImageCount,
          "Orphaned references removed": debugInfo.orphanedImageCount,
          "Images array length": result.images?.length || 0,
          "Current imageIds length": result.imageIds?.length || 0,
          "OrderedImages missing count": debugInfo.orderedImagesMissing || 0,
          "OrderedImages rebuilt": debugInfo.orderedImagesRebuilt || false,
        });
      }

      setData(result);
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to fetch gallery",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, status, session]);

  const mutate = useCallback(
    async (optimisticData?: Gallery) => {
      if (optimisticData) {
        setData(optimisticData);
        return; // Don't fetch if we have optimistic data
      }
      await fetchGallery();
    },
    [fetchGallery]
  );

  // Initial fetch - only when authentication is ready
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchGallery();
    } else if (status === "unauthenticated") {
      setIsLoading(false);
      setError(new Error("Not authenticated"));
    }
  }, [fetchGallery, status, session]);

  return { data, isLoading, error, mutate };
}

export async function createGallery(data: Partial<Gallery>) {
  return await api.post("/galleries", data);
}

export async function updateGallery(id: string, data: Partial<Gallery>) {
  return await api.put(`/galleries/${id}`, data);
}

export async function deleteGallery(id: string) {
  return await api.delete(`/galleries/${id}`);
}

export async function updateGalleryImageOrder(
  id: string,
  orderedImages: { id: string; order: number }[]
) {
  return await api.put(`/galleries/${id}/reorder`, { orderedImages });
}

export async function duplicateGallery(id: string) {
  return await api.post(`/galleries/${id}/duplicate`);
}
