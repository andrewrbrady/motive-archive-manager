import { useState, useEffect, useMemo } from "react";
import { ImageData } from "@/app/images/columns";

interface UseImagesProps {
  search?: string;
  filters?: {
    angle?: string;
    movement?: string;
    timeOfDay?: string;
    view?: string;
    carId?: string;
    page?: number;
  };
}

interface UseImagesResponse {
  data: {
    images: ImageData[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  } | null;
  isLoading: boolean;
  error: Error | null;
}

export function useImages({
  search,
  filters,
}: UseImagesProps): UseImagesResponse {
  const [data, setData] = useState<UseImagesResponse["data"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accumulatedImages, setAccumulatedImages] = useState<ImageData[]>([]);

  // Reset accumulated images when search or filters (except page) change
  useEffect(() => {
    if (filters?.page === 1 || !filters?.page) {
      setAccumulatedImages([]);
    }
  }, [
    search,
    filters?.angle,
    filters?.movement,
    filters?.timeOfDay,
    filters?.view,
    filters?.carId,
  ]);

  // Memoize the filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (filters?.angle) params.append("angle", filters.angle);
    if (filters?.movement) params.append("movement", filters.movement);
    if (filters?.timeOfDay) params.append("timeOfDay", filters.timeOfDay);
    if (filters?.view) params.append("view", filters.view);
    if (filters?.carId) params.append("carId", filters.carId);
    if (filters?.page) params.append("page", filters.page.toString());
    return params.toString();
  }, [
    search,
    filters?.angle,
    filters?.movement,
    filters?.timeOfDay,
    filters?.view,
    filters?.carId,
    filters?.page,
  ]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiUrl = `/api/images?${memoizedFilters}`;
        console.log("[useImages] Fetching images from:", apiUrl);

        const response = await fetch(apiUrl);
        console.log("[useImages] Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[useImages] Response error:", errorText);
          throw new Error(
            `Failed to fetch images: ${response.status} ${errorText}`
          );
        }

        const result = await response.json();
        console.log("[useImages] Fetched images:", {
          total: result.pagination?.total,
          imageCount: result.images?.length,
          firstImageUrl: result.images?.[0]?.url,
        });

        // Accumulate images if not on first page
        if (filters?.page && filters.page > 1) {
          setAccumulatedImages((prev) => {
            const newImages = [...prev, ...result.images];
            setData({
              images: newImages,
              pagination: result.pagination,
            });
            return newImages;
          });
        } else {
          setAccumulatedImages(result.images);
          setData(result);
        }
      } catch (err) {
        console.error("[useImages] Error details:", err);
        setError(err instanceof Error ? err : new Error("An error occurred"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [memoizedFilters]);

  return { data, isLoading, error };
}
