"use client";

import { useCallback, useRef, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ImageData } from "@/app/images/columns";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
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

interface UseImagesOptions {
  limit?: number;
  angle?: string;
  movement?: string;
  tod?: string;
  view?: string;
  carId?: string;
  page?: number;
  search?: string;
}

export function useImages(options: UseImagesOptions = {}): UseImagesResponse {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController>();

  // Create a stable query key that includes all filter options
  const queryKey = useMemo(
    () => ["images", options],
    [
      options.limit,
      options.angle,
      options.movement,
      options.tod,
      options.view,
      options.carId,
      options.page,
      options.search,
    ]
  );

  const {
    data: queryData,
    isLoading,
    error,
    refetch,
  } = useQuery<
    { images: ImageData[]; pagination: PaginationData } | null,
    Error
  >({
    queryKey,
    queryFn: async () => {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        // Return empty result if no carId is provided (unless we're fetching all images)
        if (!options.carId && options.carId !== "all") {
          return {
            images: [],
            pagination: {
              total: 0,
              page: 1,
              limit: options.limit || 20,
              pages: 0,
            },
          };
        }

        const apiSearchParams = new URLSearchParams();

        // Add all filters to search params
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            apiSearchParams.set(key, value.toString());
          }
        });

        const baseUrl =
          options.carId === "all"
            ? "/api/images"
            : `/api/cars/${options.carId}/images`;

        const response = await fetch(
          `${baseUrl}?${apiSearchParams.toString()}`,
          {
            signal: abortControllerRef.current.signal,
            // Add cache busting parameter
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to fetch images: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();

        // Validate response structure
        if (!result.images || !Array.isArray(result.images)) {
          throw new Error("Invalid response format: missing images array");
        }

        // Get existing data for the current query
        const existingData = queryClient.getQueryData<{
          images: ImageData[];
          pagination: PaginationData;
        } | null>(queryKey);

        // If this is a pagination request (page > 1), merge with existing data
        if (options.page && options.page > 1 && existingData?.images) {
          // Filter out any duplicate images that might have been added/removed
          const existingIds = new Set(
            existingData.images.map((img: ImageData) => img._id)
          );
          const newImages = result.images.filter(
            (img: ImageData) => !existingIds.has(img._id)
          );

          return {
            images: [...existingData.images, ...newImages],
            pagination: result.pagination || {
              total: result.total || result.images.length,
              page: options.page,
              limit: options.limit || 20,
              pages: Math.ceil(
                (result.total || result.images.length) / (options.limit || 20)
              ),
            },
          };
        }

        // Otherwise return fresh data
        return {
          images: result.images,
          pagination: result.pagination || {
            total: result.total || result.images.length,
            page: options.page || 1,
            limit: options.limit || 20,
            pages: Math.ceil(
              (result.total || result.images.length) / (options.limit || 20)
            ),
          },
        };
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            // Ignore abort errors as they're expected during cancellation
            throw error;
          }

          toast({
            title: "Error Loading Images",
            description: error.message || "Failed to fetch images",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: "An unexpected error occurred while loading images",
            variant: "destructive",
          });
        }
        throw error;
      }
    },
    staleTime: 0, // Disable stale time to always fetch fresh data
    gcTime: 0, // Disable garbage collection to prevent caching
    refetchOnWindowFocus: true, // Refetch when component mounts
    refetchOnMount: true, // Refetch when component mounts
    refetchOnReconnect: true, // Refetch when reconnecting
    placeholderData: (previousData) => {
      // If we have previous data and this is a pagination request, merge it
      if (previousData && options.page && options.page > 1) {
        return previousData;
      }
      // Otherwise, return fresh data
      return null;
    },
  });

  // Wrap refetch in a mutate function that matches the interface
  const mutate = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Update setFilter to reset page when changing filters
  const setFilter = useCallback(
    (key: string, value: string | null) => {
      // Create new URLSearchParams with current values
      const newSearchParams = new URLSearchParams(searchParams.toString());

      // Update the filter value
      if (value === null) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, value);
      }

      // Reset page to 1 when changing filters (except for page parameter)
      if (key !== "page") {
        newSearchParams.set("page", "1");
        // Clear the query cache when filters change
        queryClient.removeQueries({ queryKey: ["images"] });
      }

      // Update URL without refreshing the page
      router.replace(`${pathname}?${newSearchParams.toString()}`, {
        scroll: false,
      });
    },
    [searchParams, router, pathname, queryClient]
  );

  return {
    data: queryData || null,
    isLoading,
    error,
    mutate,
    setFilter,
  };
}
