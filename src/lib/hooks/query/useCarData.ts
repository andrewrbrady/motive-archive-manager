import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ObjectId } from "mongodb";
import { api } from "@/lib/api-client";

// Define types
export interface MeasurementValue {
  value: number;
  unit: string;
}

export interface Car {
  _id: string;
  make: string;
  model: string;
  year: number;
  price: string | number;
  status?: "available" | "sold" | "pending";
  primaryImageId?: string | ObjectId;
  mileage?: {
    value: number;
    unit: string;
  };
  color?: string;
  interior_color?: string;
  vin?: string;
  condition?: string;
  location?: string;
  description?: string;
  type?: string;
  images?: any[];
  imageIds?: string[];
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
      ps: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
    features?: string[];
    configuration?: string;
    cylinders?: number;
    fuelType?: string;
    manufacturer?: string;
  };
  transmission?: {
    type: string;
  };
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Hook to fetch car data
 */
export function useCarData(carId: string) {
  return useQuery({
    queryKey: ["car", carId],
    queryFn: async () => {
      return await api.get<Car>(`/cars/${carId}`);
    },
  });
}

/**
 * Hook to update car data
 */
export function useUpdateCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      carId,
      data,
    }: {
      carId: string;
      data: Partial<Car>;
    }) => {
      return await api.patch(`/cars/${carId}`, data);
    },
    onSuccess: (data, { carId }) => {
      // Invalidate both the car and carImages queries
      queryClient.invalidateQueries({ queryKey: ["car", carId] });
      queryClient.invalidateQueries({ queryKey: ["carImages", carId] });
    },
  });
}

/**
 * Hook to delete a car
 */
export function useDeleteCar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (carId: string) => {
      return await api.delete(`/cars/${carId}`);
    },
    onSuccess: (_, carId) => {
      // Remove this car from all queries
      queryClient.removeQueries({ queryKey: ["car", carId] });
      queryClient.removeQueries({ queryKey: ["carImages", carId] });

      // Invalidate the car list query to refresh it
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
  });
}
