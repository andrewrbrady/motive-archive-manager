import { useState, useCallback, useEffect } from "react";
import { useSession } from "@/hooks/useFirebaseAuth";
import { useAuthenticatedFetch } from "@/hooks/useFirebaseAuth";
import { toast } from "@/components/ui/use-toast";

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
  const { authenticatedFetch } = useAuthenticatedFetch();

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
        `/api/galleries?${searchParams.toString()}`
      );
      const response = await authenticatedFetch(
        `/api/galleries?${searchParams.toString()}`
      );
      const result = await response.json();
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
  }, [
    options.search,
    options.page,
    options.limit,
    status,
    session,
    authenticatedFetch,
  ]);

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
  const { authenticatedFetch } = useAuthenticatedFetch();

  const fetchGallery = useCallback(async () => {
    // Only fetch when authenticated
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await authenticatedFetch(`/api/galleries/${id}`);
      const result = await response.json();

      // Log debug information if available to help troubleshoot image count mismatches
      if (result._debug) {
        console.log(`🔍 Gallery ${id} Debug Info:`, result._debug);
        if (result._debug.cleanupPerformed) {
          console.log(
            `🧹 Cleanup performed! Removed ${result._debug.orphanedImageCount} orphaned image references`
          );
        }

        if (result._debug.orderedImagesRebuilt) {
          console.log(
            `🔧 orderedImages rebuilt! Added ${result._debug.orderedImagesMissing} missing images to orderedImages array`
          );
        }

        // Additional debugging for image count mismatches
        console.log(`📊 Image Count Analysis:`, {
          "Original imageIds in gallery": result._debug.originalImageCount,
          "Actual images found in DB": result._debug.foundImageCount,
          "Orphaned references removed": result._debug.orphanedImageCount,
          "Images array length": result.images?.length || 0,
          "Current imageIds length": result.imageIds?.length || 0,
          "OrderedImages missing count":
            result._debug.orderedImagesMissing || 0,
          "OrderedImages rebuilt": result._debug.orderedImagesRebuilt || false,
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
  }, [id, status, session, authenticatedFetch]);

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
  // This needs to be converted to use the API centrally, but for now we'll keep it as is
  // since it's called from components that should have useAPI available
  const response = await fetch("/api/galleries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create gallery");
  }

  return response.json();
}

export async function updateGallery(id: string, data: Partial<Gallery>) {
  const response = await fetch(`/api/galleries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update gallery");
  }

  return response.json();
}

export async function deleteGallery(id: string) {
  const response = await fetch(`/api/galleries/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete gallery");
  }

  return response.json();
}

export async function updateGalleryImageOrder(
  id: string,
  orderedImages: { id: string; order: number }[]
) {
  const response = await fetch(`/api/galleries/${id}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedImages }),
  });

  if (!response.ok) {
    throw new Error("Failed to update gallery image order");
  }

  return response.json();
}

export async function duplicateGallery(id: string) {
  const response = await fetch(`/api/galleries/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error("Failed to duplicate gallery");
  }

  return response.json();
}
