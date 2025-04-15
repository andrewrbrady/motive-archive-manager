"use client";

import { useCallback, useRef, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ImageData } from "@/app/images/columns";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useSWR, { KeyedMutator } from "swr";
import { fetcher } from "@/lib/fetcher";
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
  mutate: KeyedMutator<ImagesResponse>;
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

  const { data, error, isLoading, mutate } = useSWR<ImagesResponse>(
    `/api/images?${queryParams}`,
    fetcher
  );

  if (error) {
    toast({
      title: "Error loading images",
      description: "Please try again later",
      variant: "destructive",
    });
  }

  return {
    data: data || null,
    isLoading,
    error: error || null,
    mutate,
  };
}
