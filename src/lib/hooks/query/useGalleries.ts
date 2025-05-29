import { useState, useCallback, useEffect } from "react";
import { useAPI } from "@/lib/fetcher";
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
  const api = useAPI();

  const fetchGalleries = useCallback(async () => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams();
      if (options.search) searchParams.set("search", options.search);
      if (options.page) searchParams.set("page", options.page.toString());
      if (options.limit) searchParams.set("limit", options.limit.toString());

      const result = await api.get(`/api/galleries?${searchParams.toString()}`);
      setData(result);
    } catch (err) {
      setError(err as Error);
      toast({
        title: "Error",
        description: "Failed to fetch galleries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [options.search, options.page, options.limit, api]);

  const mutate = useCallback(async () => {
    await fetchGalleries();
  }, [fetchGalleries]);

  // Initial fetch
  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  return { data, isLoading, error, mutate };
}

export function useGallery(id: string) {
  const [data, setData] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const api = useAPI();

  const fetchGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await api.get(`/api/galleries/${id}`);
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
  }, [id, api]);

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

  // Initial fetch
  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

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
