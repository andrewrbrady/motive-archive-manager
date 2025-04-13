import { useQuery } from "@tanstack/react-query";
import { Car } from "./useCarData";

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
  const {
    page = 1,
    limit = 20,
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
      queryParams.set("limit", limit.toString());
      queryParams.set("sort", sort);
      queryParams.set("sortDirection", sortDirection);

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

      const response = await fetch(`/api/cars?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch cars");
      }

      const data = await response.json();

      return {
        cars: data.cars as Car[],
        total: data.total as number,
        pages: Math.ceil(data.total / limit),
        currentPage: page,
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
  return useQuery({
    queryKey: ["carMakes"],
    queryFn: async () => {
      const response = await fetch("/api/cars/makes");

      if (!response.ok) {
        throw new Error("Failed to fetch makes");
      }

      const data = await response.json();
      return data.makes as string[];
    },
  });
}

/**
 * Hook to fetch available models for a specific make
 */
export function useCarModels(make: string | null) {
  return useQuery({
    queryKey: ["carModels", make],
    queryFn: async () => {
      if (!make) {
        return [];
      }

      const response = await fetch(
        `/api/cars/models?make=${encodeURIComponent(make)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      return data.models as string[];
    },
    enabled: !!make, // Only run the query if make is provided
  });
}
