import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Gallery {
  _id: string;
  name: string;
  description?: string;
  imageIds: string[];
  thumbnailImage?: {
    _id: string;
    url: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GalleriesResponse {
  galleries: Gallery[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface UseGalleriesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function useGalleries(options: UseGalleriesOptions = {}) {
  const { page = 1, limit = 20, search } = options;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    queryParams.append("search", search);
  }

  const { data, error, isLoading } = useSWR<GalleriesResponse>(
    `/api/galleries?${queryParams}`,
    fetcher
  );

  return {
    data,
    isLoading,
    error,
  };
}
