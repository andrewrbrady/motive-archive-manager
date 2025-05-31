import { useQuery } from "@tanstack/react-query";
import { Car } from "./useCarData";
import { useAPI } from "@/lib/fetcher";

interface CarsQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  sortDirection?: "asc" | "desc";
  status?: "available" | "sold" | "pending" | "all";
  search?: string;
  make?: string;
  model?: string;
}

/**
 * Hook to fetch car listings with various filters
 */
export function useCars(params: CarsQueryParams = {}) {
  const api = useAPI();
  const {
    page = 1,
    limit = 1000,
    sort = "updatedAt",
    sortDirection = "desc",
    status,
    search,
    make,
    model,
  } = params;

  return useQuery({
    queryKey: [
      "cars",
      { page, limit, sort, sortDirection, status, search, make, model },
    ],
    queryFn: async () => {
      // Construct query parameters
      const queryParams = new URLSearchParams();
      queryParams.set("page", page.toString());
      queryParams.set("pageSize", limit.toString());
      queryParams.set("sort", `${sort}_${sortDirection}`);

      if (status && status !== "all") {
        queryParams.set("status", status);
      }

      if (search) {
        queryParams.set("search", search);
      }

      if (make) {
        queryParams.set("make", make);
      }

      if (model) {
        queryParams.set("model", model);
      }

      const data = await api.get(`/api/cars/simple?${queryParams.toString()}`);

      return {
        cars: data.cars as Car[],
        total: data.pagination.totalCount as number,
        pages: data.pagination.totalPages,
        currentPage: data.pagination.currentPage,
      };
    },
    // Add caching configuration
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Cache persists for 30 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount
    retry: 2, // Only retry failed requests twice
  });
}

/**
 * Hook to fetch available makes for filtering
 */
export function useCarMakes() {
  const api = useAPI();

  return useQuery({
    queryKey: ["carMakes"],
    queryFn: async () => {
      const data = await api.get("/api/cars/makes");
      return data.makes as string[];
    },
  });
}

/**
 * Hook to fetch available models for a specific make
 */
export function useCarModels(make: string | null) {
  const api = useAPI();

  return useQuery({
    queryKey: ["carModels", make],
    queryFn: async () => {
      if (!make) {
        return [];
      }

      const data = await api.get(
        `/api/cars/models?make=${encodeURIComponent(make)}`
      );
      return data.models as string[];
    },
    enabled: !!make, // Only run the query if make is provided
  });
}
