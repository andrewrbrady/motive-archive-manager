import { useAPIQuery } from "@/hooks/useAPIQuery";

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

  const { data, error, isLoading } = useAPIQuery<GalleriesResponse>(
    `/api/galleries?${queryParams}`,
    {
      staleTime: 30 * 1000, // 30 seconds - galleries don't change super frequently
    }
  );

  return {
    data,
    isLoading,
    error,
  };
}
