"use client";

import { useCallback, useRef, useMemo, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ImageData } from "@/app/images/columns";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAPIQuery } from "@/hooks/useAPIQuery";
import { Image } from "@/types";

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ImagesResponse {
  images: Image[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface UseImagesResponse {
  data: {
    images: ImageData[];
    pagination: PaginationData;
  } | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
  setFilter: (key: string, value: string | null) => void;
}

export interface UseImagesOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  sortDirection?: "asc" | "desc";
  carId?: string;
  angle?: string;
  movement?: string;
  tod?: string;
  view?: string;
}

interface UseImagesReturn {
  data: ImagesResponse | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
  setFilter?: (key: string, value: string | null) => void;
}

export function useImages(options: UseImagesOptions = {}): UseImagesReturn {
  const { toast } = useToast();
  const {
    page = 1,
    limit = 20,
    search,
    sort,
    sortDirection,
    carId,
    angle,
    movement,
    tod,
    view,
  } = options;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    queryParams.append("search", search);
  }

  if (sort) {
    queryParams.append("sort", sort);
  }

  if (sortDirection) {
    queryParams.append("sortDirection", sortDirection);
  }

  if (carId) {
    queryParams.append("carId", carId);
  }

  if (angle) {
    queryParams.append("angle", angle);
  }

  if (movement) {
    queryParams.append("movement", movement);
  }

  if (tod) {
    queryParams.append("tod", tod);
  }

  if (view) {
    queryParams.append("view", view);
  }

  const { data, error, isLoading, refetch } = useAPIQuery<ImagesResponse>(
    `/images?${queryParams}`,
    {
      // Add caching configuration
      staleTime: 1000 * 60 * 2, // Data stays fresh for 2 minutes (images change frequently)
      gcTime: 1000 * 60 * 10, // Cache persists for 10 minutes
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      retry: 2, // Only retry failed requests twice
    }
  );

  // Use useEffect to show toast when error changes
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading images",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const mutate = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data: data || null,
    isLoading,
    error: error || null,
    mutate,
  };
}
